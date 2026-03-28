import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createProjectActivityEvent } from "@/lib/project-launch";
import { parseOptionalDate } from "@/lib/project-management";
import { getProjectReadinessSummary, updateProjectKickoffSchema } from "@/lib/project-kickoff";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; projectId: string }>;
  },
) {
  const { companySlug, projectId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can run kickoff." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateProjectKickoffSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the kickoff details first." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: viewer.company.id,
    },
    include: {
      kickoffFocusTasks: {
        select: {
          taskId: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "That project could not be found." },
      { status: 404 },
    );
  }

  const selectedUsers = result.data.assignedUserIds.length
    ? await prisma.user.findMany({
        where: {
          companyId: viewer.company.id,
          id: {
            in: result.data.assignedUserIds,
          },
          status: {
            not: "INACTIVE",
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  if (selectedUsers.length !== result.data.assignedUserIds.length) {
    return NextResponse.json(
      { message: "One or more selected team members could not be used for kickoff." },
      { status: 400 },
    );
  }

  const validTaskIds = new Set(project.tasks.map((task) => task.id));
  const invalidFirstTasks = result.data.firstTaskIds.some((taskId) => !validTaskIds.has(taskId));

  if (invalidFirstTasks) {
    return NextResponse.json(
      { message: "One or more selected first tasks could not be found." },
      { status: 400 },
    );
  }

  const nextStartDate = parseOptionalDate(result.data.startDate);
  const nextEndDate = parseOptionalDate(result.data.endDate);
  const readiness = getProjectReadinessSummary({
    startDate: nextStartDate,
    endDate: nextEndDate,
    kickoffStatus: result.data.kickoffStatus,
    assignments: result.data.assignedUserIds.map((userId) => ({
      user: {
        id: userId,
        name: "",
      },
    })),
    tasks: project.tasks,
  });

  if (result.data.kickoffStatus === "COMPLETED") {
    if (result.data.firstTaskIds.length === 0) {
      return NextResponse.json(
        { message: "Choose at least one first task before completing kickoff." },
        { status: 400 },
      );
    }

    if (!readiness.isReady) {
      return NextResponse.json(
        { message: "This project still needs dates, team, and starting work before kickoff can be completed." },
        { status: 400 },
      );
    }
  }

  const wasCompleted = project.kickoffStatus === "COMPLETED";

  await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      startDate: nextStartDate,
      endDate: nextEndDate,
      kickoffStatus: result.data.kickoffStatus,
      kickoffNotes: result.data.kickoffNotes || null,
      kickoffCompletedAt:
        result.data.kickoffStatus === "COMPLETED" ? new Date() : null,
      kickoffCompletedByUserId:
        result.data.kickoffStatus === "COMPLETED" ? viewer.id : null,
      assignments: {
        deleteMany: {},
        create: result.data.assignedUserIds.map((userId) => ({
          userId,
        })),
      },
      kickoffFocusTasks: {
        deleteMany: {},
        create: result.data.firstTaskIds.map((taskId, index) => ({
          companyId: viewer.company.id,
          taskId,
          sortOrder: index,
        })),
      },
    },
  });

  if (result.data.kickoffStatus === "COMPLETED") {
    const focusTasks = await prisma.task.findMany({
      where: {
        id: {
          in: result.data.firstTaskIds,
        },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    await createProjectActivityEvent({
      companyId: viewer.company.id,
      projectId: project.id,
      userId: viewer.id,
      type: "KICKOFF_COMPLETED",
      title: wasCompleted ? "Kickoff refreshed" : "Kickoff completed",
      description:
        result.data.kickoffNotes ||
        `The team and first work were confirmed for ${project.title}.`,
      metadata: {
        teamCount: result.data.assignedUserIds.length,
        firstTaskCount: result.data.firstTaskIds.length,
        firstTaskTitles: focusTasks.map((task) => task.title).join(", "),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
