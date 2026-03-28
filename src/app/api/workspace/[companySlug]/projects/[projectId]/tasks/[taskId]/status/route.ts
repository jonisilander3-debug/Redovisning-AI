import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createTaskTimelineEvent } from "@/lib/task-timeline";
import { getTaskStatusLabel } from "@/lib/task-management";

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
      { message: "Only company managers can move tasks on the board." },
      { status: 403 },
    );
  }

  const json = (await request.json()) as { status?: string };

  if (!json.status || !Object.values(TaskStatus).includes(json.status as TaskStatus)) {
    return NextResponse.json(
      { message: "Choose a valid task status first." },
      { status: 400 },
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
      status: true,
    },
  });

  if (!task) {
    return NextResponse.json(
      { message: "That task could not be found." },
      { status: 404 },
    );
  }

  const updatedTask = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      status: json.status as TaskStatus,
    },
  });

  if (task.status !== updatedTask.status) {
    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: "STATUS_CHANGED",
      title: `Status changed to ${getTaskStatusLabel(updatedTask.status)}`,
      description: `${getTaskStatusLabel(task.status)} moved to ${getTaskStatusLabel(updatedTask.status)}.`,
    });
  }

  return NextResponse.json({ ok: true });
}
