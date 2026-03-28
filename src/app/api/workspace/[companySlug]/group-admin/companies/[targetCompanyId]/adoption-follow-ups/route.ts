import { NextResponse } from "next/server";
import { canManageGroupAdmin, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createCompanyAdoptionFollowUpSchema,
  getComputedReviewStatus,
  parseOptionalDate,
} from "@/lib/company-adoption-followups";
import { getGroupContextByCompanyId } from "@/lib/group-admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; targetCompanyId: string }>;
  },
) {
  const { companySlug, targetCompanyId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageGroupAdmin(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can create adoption follow-ups." },
      { status: 403 },
    );
  }

  const groupContext = await getGroupContextByCompanyId(viewer.company.id);

  if (!groupContext?.group) {
    return NextResponse.json(
      { message: "This workspace is not connected to a company group yet." },
      { status: 400 },
    );
  }

  const targetCompany = await prisma.company.findFirst({
    where: {
      id: targetCompanyId,
      groupId: groupContext.group.id,
    },
    select: {
      id: true,
    },
  });

  if (!targetCompany) {
    return NextResponse.json(
      { message: "That company is not part of this group." },
      { status: 404 },
    );
  }

  const parsed = createCompanyAdoptionFollowUpSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid follow-up." }, { status: 400 });
  }

  const ownerId = parsed.data.ownerId || null;

  if (ownerId) {
    const membership = await prisma.companyMembership.findFirst({
      where: {
        companyId: targetCompanyId,
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

  await prisma.companyAdoptionFollowUp.create({
    data: {
      companyId: targetCompanyId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      ownerId,
      dueDate: parseOptionalDate(parsed.data.dueDate),
      reviewByDate: parseOptionalDate(parsed.data.reviewByDate),
      reviewNote: parsed.data.reviewNote || null,
      reviewStatus: getComputedReviewStatus({
        status: parsed.data.status,
        reviewByDate: parseOptionalDate(parsed.data.reviewByDate),
        lastReviewedAt: null,
      }),
      outcomeStatus: parsed.data.outcomeStatus,
      outcomeSummary: parsed.data.outcomeSummary || null,
      outcomeRecordedAt: parsed.data.outcomeStatus !== "UNVERIFIED" ? new Date() : null,
      outcomeRecordedByUserId:
        parsed.data.outcomeStatus !== "UNVERIFIED" ? viewer.id : null,
      status: parsed.data.status,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ ok: true });
}
