import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { ensureTaskAssigneeAllowed } from "@/lib/task-management";
import { prisma } from "@/lib/prisma";
import { TaskNoteType } from "@prisma/client";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; projectId: string; taskId: string }>;
  },
) {
  const { companySlug, projectId, taskId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can reassign tasks." },
      { status: 403 },
    );
  }

  const json = (await request.json()) as {
    assignedUserId?: string;
    handoffNote?: string;
  };

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      assignedUserId: true,
      title: true,
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "That task could not be found." },
      { status: 404 },
    );
  }

  try {
    await ensureTaskAssigneeAllowed({
      companyId: viewer.company.id,
      projectId,
      assignedUserId: json.assignedUserId || undefined,
    });

    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        assignedUserId: json.assignedUserId || null,
      },
      include: {
        assignedUser: {
          select: {
            name: true,
          },
        },
      },
    });

    if (task.assignedUserId !== (json.assignedUserId || null)) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId,
        taskId: updatedTask.id,
        userId: viewer.id,
        type: "ASSIGNEE_CHANGED",
        title: updatedTask.assignedUser
          ? `Assigned to ${updatedTask.assignedUser.name}`
          : "Assignment cleared",
        description: task.title,
      });
    }

    if (
      task.assignedUserId !== (json.assignedUserId || null) &&
      json.handoffNote?.trim()
    ) {
      const note = await prisma.taskNote.create({
        data: {
          companyId: viewer.company.id,
          projectId,
          taskId: updatedTask.id,
          userId: viewer.id,
          type: TaskNoteType.HANDOFF,
          content: json.handoffNote.trim(),
        },
      });

      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId,
        taskId: updatedTask.id,
        userId: viewer.id,
        type: "HANDOFF_ADDED",
        title: "Added a handoff note during reassignment",
        description: note.content,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not reassign that task.",
      },
      { status: 400 },
    );
  }
}
