import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer, isEmployeeRole } from "@/lib/access";
import { startWorkSchema, startWorkEntry } from "@/lib/time-tracking";
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
  const result = startWorkSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please keep the note short and simple." },
      { status: 400 },
    );
  }

  try {
    const entry = await startWorkEntry({
      companyId: viewer.company.id,
      userId: viewer.id,
      projectId: result.data.projectId,
      taskId: result.data.taskId || undefined,
      note: result.data.note,
    });

    if (entry.taskId) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId: entry.projectId!,
        taskId: entry.taskId,
        userId: viewer.id,
        type: "TIME_STARTED",
        title: "Started work on this task",
        description: entry.note || "A work session was started from My Day.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not start work right now.",
      },
      { status: 400 },
    );
  }
}
