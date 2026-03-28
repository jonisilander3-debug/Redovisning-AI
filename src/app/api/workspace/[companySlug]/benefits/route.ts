import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createBenefitEntrySchema } from "@/lib/benefits";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create benefits." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createBenefitEntrySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the benefit details first." },
      { status: 400 },
    );
  }

  const date = new Date(result.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Choose a valid benefit date." }, { status: 400 });
  }

  const entry = await prisma.benefitEntry.create({
    data: {
      companyId: viewer.company.id,
      userId: result.data.userId,
      type: result.data.type,
      description: result.data.description,
      taxableAmount: result.data.taxableAmount,
      date,
      status: result.data.status,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, benefitEntryId: entry.id });
}
