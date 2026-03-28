import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createChecklistItemSchema,
  ensureChecklistAssigneeAllowed,
} from "@/lib/checklist-management";
import { prisma } from "@/lib/prisma";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function POST(
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
      { message: "Only company managers can add checklist steps." },
      { status: 403 },
    );
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      _count: {
        select: {
          checklistItems: true,
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "That task could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = createChecklistItemSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the checklist item details first." },
      { status: 400 },
    );
  }

  try {
    await ensureChecklistAssigneeAllowed({
      companyId: viewer.company.id,
      projectId,
      assignedUserId: result.data.assignedUserId || undefined,
    });

    const createdItem = await prisma.checklistItem.create({
      data: {
        companyId: viewer.company.id,
        projectId,
        taskId,
        title: result.data.title,
        description: result.data.description || null,
        status: result.data.status,
        sortOrder:
          typeof result.data.sortOrder === "number"
            ? result.data.sortOrder
            : task._count.checklistItems,
        assignedUserId: result.data.assignedUserId || null,
        completedAt: result.data.status === "DONE" ? new Date() : null,
      },
    });

    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: "CHECKLIST_ITEM_ADDED",
      title: `Added checklist step: ${createdItem.title}`,
      description: createdItem.assignedUserId
        ? "The step was added with an owner."
        : "The step was added without a specific owner.",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that checklist item.",
      },
      { status: 400 },
    );
  }
}
