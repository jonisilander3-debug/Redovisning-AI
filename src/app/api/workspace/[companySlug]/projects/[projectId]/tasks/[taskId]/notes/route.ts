import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import {
  canCreateTaskNoteType,
  createTaskNoteSchema,
  ensureTaskNoteAccess,
} from "@/lib/task-notes";
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

  const task = await ensureTaskNoteAccess({
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
  const result = createTaskNoteSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please add a short note first." },
      { status: 400 },
    );
  }

  if (!canCreateTaskNoteType(viewer.role, result.data.type)) {
    return NextResponse.json(
      { message: "You do not have access to create that kind of note." },
      { status: 403 },
    );
  }

  const createdNote = await prisma.taskNote.create({
    data: {
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: result.data.type,
      content: result.data.content,
    },
  });

  await createTaskTimelineEvent({
    companyId: viewer.company.id,
    projectId,
    taskId,
    userId: viewer.id,
    type: createdNote.type === "HANDOFF" ? "HANDOFF_ADDED" : "NOTE_ADDED",
    title:
      createdNote.type === "HANDOFF"
        ? "Added a handoff note"
        : "Added a task note",
    description: createdNote.content,
  });

  return NextResponse.json({ ok: true });
}
