import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  ensureTaskAssigneeAllowed,
  parseOptionalTaskDate,
  updateTaskSchema,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/lib/task-management";
import { prisma } from "@/lib/prisma";
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
      { message: "Only company managers can update tasks." },
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
      title: true,
      status: true,
      priority: true,
      assignedUserId: true,
      assignedUser: {
        select: {
          name: true,
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
  const result = updateTaskSchema.safeParse(json);

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

    const nextAssignedUserId = result.data.assignedUserId || null;
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        title: result.data.title,
        description: result.data.description || null,
        status: result.data.status,
        priority: result.data.priority,
        assignedUserId: nextAssignedUserId,
        plannedStartDate: parseOptionalTaskDate(result.data.plannedStartDate),
        plannedEndDate: parseOptionalTaskDate(result.data.plannedEndDate),
        dueDate: parseOptionalTaskDate(result.data.dueDate),
      },
      include: {
        assignedUser: {
          select: {
            name: true,
          },
        },
      },
    });

    const timelineEvents = [];

    if (task.status !== updatedTask.status) {
      timelineEvents.push(
        createTaskTimelineEvent({
          companyId: viewer.company.id,
          projectId,
          taskId,
          userId: viewer.id,
          type: "STATUS_CHANGED",
          title: `Status changed to ${getTaskStatusLabel(updatedTask.status)}`,
          description: `${getTaskStatusLabel(task.status)} moved to ${getTaskStatusLabel(updatedTask.status)}.`,
        }),
      );
    }

    if (task.priority !== updatedTask.priority) {
      timelineEvents.push(
        createTaskTimelineEvent({
          companyId: viewer.company.id,
          projectId,
          taskId,
          userId: viewer.id,
          type: "PRIORITY_CHANGED",
          title: `Priority changed to ${getTaskPriorityLabel(updatedTask.priority)}`,
          description: `${getTaskPriorityLabel(task.priority)} changed to ${getTaskPriorityLabel(updatedTask.priority)}.`,
        }),
      );
    }

    if (task.assignedUserId !== updatedTask.assignedUserId) {
      timelineEvents.push(
        createTaskTimelineEvent({
          companyId: viewer.company.id,
          projectId,
          taskId,
          userId: viewer.id,
          type: "ASSIGNEE_CHANGED",
          title: updatedTask.assignedUser
            ? `Assigned to ${updatedTask.assignedUser.name}`
            : "Assignment cleared",
          description: task.assignedUser?.name
            ? `Previously assigned to ${task.assignedUser.name}.`
            : "This task did not have an assignee before.",
        }),
      );
    }

    if (
      task.title !== updatedTask.title ||
      result.data.description !== (updatedTask.description || "") ||
      parseOptionalTaskDate(result.data.plannedStartDate)?.getTime() !==
        updatedTask.plannedStartDate?.getTime() ||
      parseOptionalTaskDate(result.data.plannedEndDate)?.getTime() !==
        updatedTask.plannedEndDate?.getTime() ||
      parseOptionalTaskDate(result.data.dueDate)?.getTime() !== updatedTask.dueDate?.getTime()
    ) {
      timelineEvents.push(
        createTaskTimelineEvent({
          companyId: viewer.company.id,
          projectId,
          taskId,
          userId: viewer.id,
          type: "TASK_UPDATED",
          title: `Updated ${updatedTask.title}`,
          description: "Task details or planning dates were refreshed.",
        }),
      );
    }

    await Promise.all(timelineEvents);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not update that task.",
      },
      { status: 400 },
    );
  }
}
