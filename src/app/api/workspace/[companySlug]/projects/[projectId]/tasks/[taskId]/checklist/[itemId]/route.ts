import { ChecklistItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  canManageProjects,
  getCurrentWorkspaceViewer,
  isEmployeeRole,
} from "@/lib/access";
import {
  ensureChecklistAssigneeAllowed,
  getChecklistItemForViewer,
  updateChecklistItemSchema,
} from "@/lib/checklist-management";
import { prisma } from "@/lib/prisma";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      companySlug: string;
      projectId: string;
      taskId: string;
      itemId: string;
    }>;
  },
) {
  const { companySlug, projectId, taskId, itemId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  const item = await getChecklistItemForViewer({
    companyId: viewer.company.id,
    projectId,
    taskId,
    itemId,
    viewer,
  });

  if (!item) {
    return NextResponse.json(
      { message: "That checklist item could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();

  if (canManageProjects(viewer.role)) {
    const result = updateChecklistItemSchema.safeParse(json);

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

      const updatedItem = await prisma.checklistItem.update({
        where: {
          id: itemId,
        },
        data: {
          title: result.data.title,
          description: result.data.description || null,
          status: result.data.status,
          sortOrder: result.data.sortOrder,
          assignedUserId: result.data.assignedUserId || null,
          completedAt:
            result.data.status === "DONE"
              ? item.completedAt ?? new Date()
              : null,
        },
      });

      if (item.status !== updatedItem.status) {
        await createTaskTimelineEvent({
          companyId: viewer.company.id,
          projectId,
          taskId,
          userId: viewer.id,
          type:
            updatedItem.status === "DONE"
              ? "CHECKLIST_ITEM_COMPLETED"
              : "CHECKLIST_ITEM_REOPENED",
          title:
            updatedItem.status === "DONE"
              ? `Completed checklist step: ${updatedItem.title}`
              : `Reopened checklist step: ${updatedItem.title}`,
          description:
            updatedItem.status === "DONE"
              ? "The step was marked as done."
              : "The step was moved back into open work.",
        });
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "We could not update that checklist item.",
        },
        { status: 400 },
      );
    }
  }

  if (isEmployeeRole(viewer.role)) {
    const status =
      json && typeof json.status === "string" && json.status in ChecklistItemStatus
        ? (json.status as ChecklistItemStatus)
        : null;

    if (!status) {
      return NextResponse.json(
        { message: "Only the done state can be updated here." },
        { status: 400 },
      );
    }

    const updatedItem = await prisma.checklistItem.update({
      where: {
        id: itemId,
      },
      data: {
        status,
        completedAt: status === "DONE" ? item.completedAt ?? new Date() : null,
      },
    });

    if (item.status !== updatedItem.status) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId,
        taskId,
        userId: viewer.id,
        type:
          updatedItem.status === "DONE"
            ? "CHECKLIST_ITEM_COMPLETED"
            : "CHECKLIST_ITEM_REOPENED",
        title:
          updatedItem.status === "DONE"
            ? `Completed checklist step: ${updatedItem.title}`
            : `Reopened checklist step: ${updatedItem.title}`,
        description:
          updatedItem.status === "DONE"
            ? "The step was checked off from the field."
            : "The step was reopened and needs attention again.",
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { message: "You do not have access to update this checklist item." },
    { status: 403 },
  );
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      companySlug: string;
      projectId: string;
      taskId: string;
      itemId: string;
    }>;
  },
) {
  const { companySlug, projectId, taskId, itemId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can remove checklist steps." },
      { status: 403 },
    );
  }

  const item = await getChecklistItemForViewer({
    companyId: viewer.company.id,
    projectId,
    taskId,
    itemId,
    viewer,
  });

  if (!item) {
    return NextResponse.json(
      { message: "That checklist item could not be found." },
      { status: 404 },
    );
  }

  await prisma.checklistItem.delete({
    where: {
      id: itemId,
    },
  });

  return NextResponse.json({ ok: true });
}
