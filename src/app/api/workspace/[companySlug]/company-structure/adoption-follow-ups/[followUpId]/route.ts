import { NextResponse } from "next/server";
import { canManageCompanyStructure, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  getComputedReviewStatus,
  parseOptionalDate,
  updateCompanyAdoptionFollowUpSchema,
} from "@/lib/company-adoption-followups";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; followUpId: string }>;
  },
) {
  const { companySlug, followUpId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageCompanyStructure(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can update adoption follow-ups." },
      { status: 403 },
    );
  }

  const existingFollowUp = await prisma.companyAdoptionFollowUp.findFirst({
    where: {
      id: followUpId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      status: true,
      companyId: true,
      reviewByDate: true,
      lastReviewedAt: true,
      reviewNote: true,
      outcomeStatus: true,
      outcomeSummary: true,
    },
  });

  if (!existingFollowUp) {
    return NextResponse.json({ message: "That follow-up could not be found." }, { status: 404 });
  }

  const parsed = updateCompanyAdoptionFollowUpSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid follow-up update." }, { status: 400 });
  }

  const ownerId = parsed.data.ownerId || null;

  if (ownerId) {
    const membership = await prisma.companyMembership.findFirst({
      where: {
        companyId: viewer.company.id,
        userId: ownerId,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "The follow-up owner must already have access to this company." },
        { status: 400 },
      );
    }
  }

  const nextStatus = parsed.data.status ?? existingFollowUp.status;
  const nextReviewByDate =
    parsed.data.reviewByDate !== undefined
      ? parseOptionalDate(parsed.data.reviewByDate)
      : existingFollowUp.reviewByDate;
  const nextLastReviewedAt = parsed.data.markReviewed ? new Date() : existingFollowUp.lastReviewedAt;
  const nextOutcomeStatus = parsed.data.outcomeStatus ?? existingFollowUp.outcomeStatus;
  const shouldRecordOutcome =
    parsed.data.markOutcomeRecorded || parsed.data.outcomeStatus !== undefined;

  await prisma.companyAdoptionFollowUp.update({
    where: {
      id: followUpId,
    },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      ownerId,
      dueDate: parseOptionalDate(parsed.data.dueDate),
      reviewByDate: nextReviewByDate,
      lastReviewedAt: nextLastReviewedAt,
      lastReviewedByUserId: parsed.data.markReviewed ? viewer.id : undefined,
      reviewNote:
        parsed.data.reviewNote !== undefined
          ? parsed.data.reviewNote || null
          : existingFollowUp.reviewNote,
      reviewStatus: getComputedReviewStatus({
        status: nextStatus,
        reviewByDate: nextReviewByDate,
        lastReviewedAt: nextLastReviewedAt,
      }),
      outcomeStatus: nextOutcomeStatus,
      outcomeSummary:
        parsed.data.outcomeSummary !== undefined
          ? parsed.data.outcomeSummary || null
          : existingFollowUp.outcomeSummary,
      outcomeRecordedAt: shouldRecordOutcome ? new Date() : undefined,
      outcomeRecordedByUserId: shouldRecordOutcome ? viewer.id : undefined,
      status: nextStatus,
      priority: parsed.data.priority,
      completedAt: nextStatus === "DONE" ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
