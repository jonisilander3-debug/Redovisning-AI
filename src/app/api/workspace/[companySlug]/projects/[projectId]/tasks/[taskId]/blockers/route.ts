import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import { createBlockerSchema, ensureBlockerTaskAccess } from "@/lib/blockers";
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

  const task = await ensureBlockerTaskAccess({
    viewer,
    companyId: viewer.company.id,
    projectId,
    taskId,
  });

  if (!task) {
    return NextResponse.json(
      { message: "That task could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = createBlockerSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please add a short blocker title and description." },
      { status: 400 },
    );
  }

  const blocker = await prisma.taskBlocker.create({
    data: {
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      title: result.data.title,
      description: result.data.description,
      severity: result.data.severity,
    },
  });

  await createTaskTimelineEvent({
    companyId: viewer.company.id,
    projectId,
    taskId,
    userId: viewer.id,
    type: "BLOCKER_REPORTED",
    title: `Blocker reported: ${blocker.title}`,
    description: blocker.description,
  });

  return NextResponse.json({ ok: true });
}
