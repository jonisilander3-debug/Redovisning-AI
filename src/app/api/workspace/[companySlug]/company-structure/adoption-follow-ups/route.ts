import { NextResponse } from "next/server";
import { canManageCompanyStructure, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createCompanyAdoptionFollowUpSchema,
  getComputedReviewStatus,
  parseOptionalDate,
} from "@/lib/company-adoption-followups";
import { prisma } from "@/lib/prisma";

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

  if (!canManageCompanyStructure(viewer.role)) {
    return NextResponse.json(
      { message: "Only owners and admins can create adoption follow-ups." },
      { status: 403 },
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

  await prisma.companyAdoptionFollowUp.create({
    data: {
      companyId: viewer.company.id,
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
