import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { updateBenefitEntrySchema } from "@/lib/benefits";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companySlug: string; benefitEntryId: string }> },
) {
  const { companySlug, benefitEntryId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update benefits." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = updateBenefitEntrySchema.safeParse(json);

  if (!result.success || !result.data.status) {
    return NextResponse.json({ message: "Choose a valid benefit update." }, { status: 400 });
  }

  await prisma.benefitEntry.updateMany({
    where: {
      id: benefitEntryId,
      companyId: viewer.company.id,
    },
    data: {
      status: result.data.status,
    },
  });

  return NextResponse.json({ ok: true });
}
