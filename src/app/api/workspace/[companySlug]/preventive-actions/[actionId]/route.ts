import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  canManagePreventiveActions,
  ensurePreventiveActionOwnerAllowed,
  getPreventiveActionForViewer,
  parseOptionalPreventionDate,
  updatePreventiveActionSchema,
} from "@/lib/recurrence-prevention";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; actionId: string }>;
  },
) {
  const { companySlug, actionId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManagePreventiveActions(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can manage preventive actions." },
      { status: 403 },
    );
  }

  const action = await getPreventiveActionForViewer({ viewer, actionId });

  if (!action) {
    return NextResponse.json(
      { message: "That preventive action could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = updatePreventiveActionSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please choose a valid preventive action update." },
      { status: 400 },
    );
  }

  try {
    await ensurePreventiveActionOwnerAllowed({
      companyId: viewer.company.id,
      ownerId: result.data.ownerId || undefined,
    });

    const updatedAction = await prisma.preventiveAction.update({
      where: {
        id: action.id,
      },
      data: {
        ownerId: result.data.ownerId || null,
        title: result.data.title,
        description: result.data.description,
        status: result.data.status,
        dueDate: parseOptionalPreventionDate(result.data.dueDate),
      },
    });

    if (action.projectId && action.relatedTaskId) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId: action.projectId,
        taskId: action.relatedTaskId,
        userId: viewer.id,
        type: "TASK_UPDATED",
        title: `Preventive action updated: ${updatedAction.title}`,
        description:
          updatedAction.status === "DONE"
            ? "The preventive action was completed."
            : "The preventive action details were updated.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not update that preventive action.",
      },
      { status: 400 },
    );
  }
}
