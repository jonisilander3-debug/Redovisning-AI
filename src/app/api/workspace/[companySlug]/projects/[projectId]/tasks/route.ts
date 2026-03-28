import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { ensureExecutionImprovementsAllowed } from "@/lib/execution-improvements";
import {
  createTaskSchema,
  ensureTaskAssigneeAllowed,
  parseOptionalTaskDate,
} from "@/lib/task-management";
import { prisma } from "@/lib/prisma";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function POST(
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
      { message: "Only company managers can create tasks." },
      { status: 403 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "That project could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = createTaskSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the task details first." },
      { status: 400 },
    );
  }

  try {
    await ensureTaskAssigneeAllowed({
      companyId: viewer.company.id,
      projectId,
      assignedUserId: result.data.assignedUserId || undefined,
    });

    const selectedImprovements = await ensureExecutionImprovementsAllowed({
      companyId: viewer.company.id,
      projectId,
      improvementIds: result.data.selectedImprovementIds,
    });

    const template = result.data.templateId
      ? await prisma.workTemplate.findFirst({
          where: {
            id: result.data.templateId,
            companyId: viewer.company.id,
          },
          include: {
            checklistItems: {
              where: {
                templateTaskId: null,
              },
              orderBy: [{ sortOrder: "asc" }],
            },
            linkedImprovements: {
              include: {
                executionImprovement: true,
              },
            },
          },
        })
      : null;

    if (result.data.templateId && (!template || template.templateType !== "TASK_TEMPLATE")) {
      return NextResponse.json(
        { message: "That task template could not be found." },
        { status: 404 },
      );
    }

    const templateImprovements = template
      ? template.linkedImprovements.map((link) => link.executionImprovement)
      : [];
    const combinedImprovements = [
      ...templateImprovements,
      ...selectedImprovements.filter(
        (improvement) => !templateImprovements.some((item) => item.id === improvement.id),
      ),
    ];

    const createdTask = await prisma.task.create({
      data: {
        companyId: viewer.company.id,
        projectId,
        title: result.data.title || template?.defaultTaskTitle || "New task",
        description:
          result.data.description ||
          template?.defaultTaskDescription ||
          null,
        status: result.data.status,
        priority: result.data.priority,
        assignedUserId: result.data.assignedUserId || null,
        plannedStartDate: parseOptionalTaskDate(result.data.plannedStartDate),
        plannedEndDate: parseOptionalTaskDate(result.data.plannedEndDate),
        dueDate: parseOptionalTaskDate(result.data.dueDate),
        appliedImprovements: combinedImprovements.length
          ? {
              create: combinedImprovements.map((improvement) => ({
                companyId: viewer.company.id,
                executionImprovementId: improvement.id,
              })),
            }
          : undefined,
        checklistItems:
          combinedImprovements.filter(
            (improvement) => improvement.targetType === "CHECKLIST_ITEM",
          ).length || (template?.checklistItems.length ?? 0) > 0
            ? {
                create: [
                  ...(template?.checklistItems.map((item, index) => ({
                    companyId: viewer.company.id,
                    projectId,
                    title: item.title,
                    description: item.description || null,
                    sortOrder: index,
                    sourceExecutionImprovementId: item.sourceExecutionImprovementId,
                  })) ?? []),
                  ...combinedImprovements
                    .filter((improvement) => improvement.targetType === "CHECKLIST_ITEM")
                    .map((improvement, index) => ({
                      companyId: viewer.company.id,
                      projectId,
                      title: improvement.title,
                      description: improvement.description,
                      sortOrder: (template?.checklistItems.length ?? 0) + index,
                      sourceExecutionImprovementId: improvement.id,
                    })),
                ],
              }
            : undefined,
      },
    });

    if (combinedImprovements.length > 0) {
      await prisma.executionImprovement.updateMany({
        where: {
          id: {
            in: combinedImprovements.map((improvement) => improvement.id),
          },
        },
        data: {
          status: "APPLIED",
        },
      });
    }

    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId: createdTask.id,
      userId: viewer.id,
      type: "TASK_CREATED",
      title: `Created ${createdTask.title}`,
      description: createdTask.assignedUserId
        ? "The task was created and assigned right away."
        : "The task was created and is ready for planning.",
    });

    if (combinedImprovements.length > 0 || (template?.checklistItems.length ?? 0) > 0) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId,
        taskId: createdTask.id,
        userId: viewer.id,
        type: "TASK_UPDATED",
        title: template ? "Applied task template" : "Applied prevention improvements",
        description: template
          ? "Template checklist steps and guidance were added to this task."
          : `${combinedImprovements.length} prevention-based improvement${combinedImprovements.length === 1 ? "" : "s"} were added to this task.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not create that task.",
      },
      { status: 400 },
    );
  }
}
