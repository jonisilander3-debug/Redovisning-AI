import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  canManagePreventiveActions,
  createPreventiveActionSchema,
  ensurePreventiveActionOwnerAllowed,
  parseOptionalPreventionDate,
} from "@/lib/recurrence-prevention";
import { createTaskTimelineEvent } from "@/lib/task-timeline";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string }>;
  },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManagePreventiveActions(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create preventive actions." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createPreventiveActionSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please add a short prevention title and description." },
      { status: 400 },
    );
  }

  try {
    await ensurePreventiveActionOwnerAllowed({
      companyId: viewer.company.id,
      ownerId: result.data.ownerId || undefined,
    });

    if (result.data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: result.data.projectId,
          companyId: viewer.company.id,
        },
        select: { id: true },
      });

      if (!project) {
        return NextResponse.json(
          { message: "That project could not be found." },
          { status: 404 },
        );
      }
    }

    if (result.data.relatedTaskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: result.data.relatedTaskId,
          companyId: viewer.company.id,
          ...(result.data.projectId ? { projectId: result.data.projectId } : {}),
        },
        select: { id: true, projectId: true, title: true },
      });

      if (!task) {
        return NextResponse.json(
          { message: "That task could not be found." },
          { status: 404 },
        );
      }
    }

    let sourceBlocker:
      | { id: string; projectId: string; taskId: string; title: string }
      | null = null;

    if (result.data.sourceBlockerId) {
      sourceBlocker = await prisma.taskBlocker.findFirst({
        where: {
          id: result.data.sourceBlockerId,
          companyId: viewer.company.id,
        },
        select: {
          id: true,
          projectId: true,
          taskId: true,
          title: true,
        },
      });

      if (!sourceBlocker) {
        return NextResponse.json(
          { message: "That blocker could not be found." },
          { status: 404 },
        );
      }
    }

    const projectId = result.data.projectId || sourceBlocker?.projectId || null;
    const relatedTaskId = result.data.relatedTaskId || sourceBlocker?.taskId || null;

    const action = await prisma.preventiveAction.create({
      data: {
        companyId: viewer.company.id,
        projectId,
        relatedTaskId,
        sourceBlockerId: result.data.sourceBlockerId || null,
        ownerId: result.data.ownerId || null,
        title: result.data.title,
        description: result.data.description,
        status: result.data.status,
        dueDate: parseOptionalPreventionDate(result.data.dueDate),
      },
    });

    if (projectId && relatedTaskId) {
      await createTaskTimelineEvent({
        companyId: viewer.company.id,
        projectId,
        taskId: relatedTaskId,
        userId: viewer.id,
        type: "TASK_UPDATED",
        title: `Preventive action created: ${action.title}`,
        description: sourceBlocker
          ? `Created from blocker: ${sourceBlocker.title}`
          : "A preventive action was added for this task.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not save that preventive action.",
      },
      { status: 400 },
    );
  }
}
