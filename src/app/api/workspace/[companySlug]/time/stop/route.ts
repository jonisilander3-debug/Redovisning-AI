import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer, isEmployeeRole } from "@/lib/access";
import { stopWorkEntry, stopWorkSchema } from "@/lib/time-tracking";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!isEmployeeRole(viewer.role)) {
    return NextResponse.json(
      { message: "This action is available in the employee workspace only." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = stopWorkSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please keep the note short and simple." },
      { status: 400 },
    );
  }

  try {
    const entry = await stopWorkEntry({
      userId: viewer.id,
      note: result.data.note,
    });

    if (entry.taskId && entry.projectId) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId: entry.projectId,
        taskId: entry.taskId,
        userId: viewer.id,
        type: "TIME_STOPPED",
        title: "Stopped work on this task",
        description: entry.note || "A work session was completed from My Day.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not stop work right now.",
      },
      { status: 400 },
    );
  }
}
