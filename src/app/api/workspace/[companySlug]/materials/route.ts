import { NextResponse } from "next/server";
import { createJournalEntryFromMaterial } from "@/lib/accounting";
import { createMaterialAccountingSuggestion } from "@/lib/accounting-suggestions";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createMaterialEntrySchema,
  decimalFromNumber,
  parseOptionalDate,
} from "@/lib/invoicing";
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
      { message: "Only company managers can add material entries." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createMaterialEntrySchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the material details first." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: result.data.projectId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "Choose a project in this company first." },
      { status: 404 },
    );
  }

  const materialEntry = await prisma.materialEntry.create({
    data: {
      companyId: viewer.company.id,
      projectId: project.id,
      userId: viewer.id,
      description: result.data.description,
      quantity: decimalFromNumber(result.data.quantity),
      unitCost: decimalFromNumber(result.data.unitCost),
      unitPrice: decimalFromNumber(result.data.unitPrice),
      isBillable: result.data.isBillable,
      supplierName: result.data.supplierName || null,
      vatRate:
        typeof result.data.vatRate === "number"
          ? decimalFromNumber(result.data.vatRate)
          : null,
      receiptDate: parseOptionalDate(result.data.receiptDate) ?? null,
      receiptUrl: result.data.receiptUrl || null,
    },
  });

  if (result.data.supplierName && typeof result.data.vatRate === "number") {
    await createJournalEntryFromMaterial(materialEntry.id);
    return NextResponse.json({ ok: true, accountingStatus: "BOOKED" });
  }

  await createMaterialAccountingSuggestion(materialEntry.id);
  return NextResponse.json({ ok: true, accountingStatus: "SUGGESTED" });
}
