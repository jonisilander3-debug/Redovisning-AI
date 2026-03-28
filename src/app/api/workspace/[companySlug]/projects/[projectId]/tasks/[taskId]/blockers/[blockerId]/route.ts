import { NextResponse } from "next/server";
import {
  canResolveBlockers,
  ensureFollowUpOwnerAllowed,
  getBlockerForViewer,
  parseOptionalFollowUpDate,
  resolveBlockerSchema,
  updateBlockerOutcomeSchema,
  updateBlockerFollowUpSchema,
} from "@/lib/blockers";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
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
      blockerId: string;
    }>;
  },
) {
  const { companySlug, projectId, taskId, blockerId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  const blocker = await getBlockerForViewer({
    viewer,
    companyId: viewer.company.id,
    projectId,
    taskId,
    blockerId,
  });

  if (!blocker) {
    return NextResponse.json(
      { message: "That blocker could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();

  const outcomeResult = updateBlockerOutcomeSchema.safeParse(json);

  if (outcomeResult.success) {
    const canManage = canManageProjects(viewer.role);
    const isEmployeeFeedback =
      !canManage &&
      (outcomeResult.data.outcomeStatus === "REOPENED" ||
        outcomeResult.data.outcomeStatus === "RESOLVED_PARTIAL");

    if (!canManage && !isEmployeeFeedback) {
      return NextResponse.json(
        { message: "You do not have access to update blocker outcomes." },
        { status: 403 },
      );
    }

    const isReopened = outcomeResult.data.outcomeStatus === "REOPENED";

    const updatedBlocker = await prisma.taskBlocker.update({
      where: {
        id: blocker.id,
      },
      data: {
        status: isReopened ? "OPEN" : blocker.status,
        outcomeStatus: outcomeResult.data.outcomeStatus,
        outcomeSummary: outcomeResult.data.outcomeSummary || null,
        verifiedByUserId: canManage ? viewer.id : blocker.verifiedByUserId,
        verifiedAt: canManage ? new Date() : blocker.verifiedAt,
        reopenedAt: isReopened ? new Date() : blocker.reopenedAt,
        reopenReason: isReopened
          ? outcomeResult.data.reopenReason || outcomeResult.data.outcomeSummary || null
          : null,
        resolvedAt: isReopened ? null : blocker.resolvedAt,
      },
    });

    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: isReopened ? "BLOCKER_REOPENED" : "BLOCKER_OUTCOME_UPDATED",
      title: isReopened
        ? `Blocker reopened: ${updatedBlocker.title}`
        : `Outcome updated for ${updatedBlocker.title}`,
      description:
        outcomeResult.data.reopenReason ||
        outcomeResult.data.outcomeSummary ||
        (isReopened
          ? "The blocker is still affecting the work."
          : "The blocker outcome was updated."),
    });

    return NextResponse.json({ ok: true });
  }

  if (!canResolveBlockers(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can manage blocker recovery here." },
      { status: 403 },
    );
  }

  const resolveResult = resolveBlockerSchema.safeParse(json);

  if (resolveResult.success) {
    const updatedBlocker = await prisma.taskBlocker.update({
      where: {
        id: blocker.id,
      },
      data: {
        status: "RESOLVED",
        resolutionNote: resolveResult.data.resolutionNote || null,
        resolvedAt: new Date(),
        followUpStatus:
          blocker.followUpAction || blocker.followUpOwnerId || blocker.followUpDate
            ? "DONE"
            : blocker.followUpStatus,
        lastFollowUpAt:
          blocker.followUpAction || blocker.followUpOwnerId || blocker.followUpDate
            ? new Date()
            : blocker.lastFollowUpAt,
        outcomeStatus: "UNVERIFIED",
        outcomeSummary: null,
        verifiedByUserId: null,
        verifiedAt: null,
        reopenedAt: null,
        reopenReason: null,
      },
    });

    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: "BLOCKER_RESOLVED",
      title: `Blocker resolved: ${updatedBlocker.title}`,
      description:
        updatedBlocker.resolutionNote || "The blocker was marked as resolved.",
    });

    return NextResponse.json({ ok: true });
  }

  const followUpResult = updateBlockerFollowUpSchema.safeParse(json);

  if (!followUpResult.success) {
    return NextResponse.json(
      { message: "Please choose a valid blocker update." },
      { status: 400 },
    );
  }

  try {
    await ensureFollowUpOwnerAllowed({
      companyId: viewer.company.id,
      followUpOwnerId: followUpResult.data.followUpOwnerId || undefined,
    });

    const updatedBlocker = await prisma.taskBlocker.update({
      where: {
        id: blocker.id,
      },
      data: {
        followUpAction: followUpResult.data.followUpAction || null,
        followUpOwnerId: followUpResult.data.followUpOwnerId || null,
        followUpDate: parseOptionalFollowUpDate(followUpResult.data.followUpDate),
        followUpStatus: followUpResult.data.followUpStatus || null,
        lastFollowUpAt: new Date(),
      },
      include: {
        followUpOwner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await createTaskTimelineEvent({
      companyId: viewer.company.id,
      projectId,
      taskId,
      userId: viewer.id,
      type: "TASK_UPDATED",
      title: `Follow-up plan updated for ${updatedBlocker.title}`,
      description: updatedBlocker.followUpOwner
        ? `Next step is owned by ${updatedBlocker.followUpOwner.name}.`
        : "Follow-up details were updated.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not update that follow-up plan.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
