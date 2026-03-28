import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createInvoiceFromDraftPreview, invoiceDraftSchema, parseOptionalDate } from "@/lib/billing";

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
    return NextResponse.json({ message: "Only company managers can create invoices." }, { status: 403 });
  }

  const result = invoiceDraftSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ message: "Kontrollera fakturautkastet och forsok igen." }, { status: 400 });
  }

  try {
    const invoice = await createInvoiceFromDraftPreview(result.data.projectId, {
      companyId: viewer.company.id,
      invoiceMode: result.data.invoiceMode,
      vatRate: result.data.vatRate,
      defaultHourlyRate: result.data.defaultHourlyRate,
      issueDate: parseOptionalDate(result.data.issueDate),
      dueDate: parseOptionalDate(result.data.dueDate),
      billingPeriodStart: parseOptionalDate(result.data.billingPeriodStart),
      billingPeriodEnd: parseOptionalDate(result.data.billingPeriodEnd),
      selectedTimeEntryIds: result.data.selectedTimeEntryIds,
      selectedMaterialEntryIds: result.data.selectedMaterialEntryIds,
      customerId: result.data.customerId || null,
    });

    return NextResponse.json({ ok: true, invoiceId: invoice.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Fakturan kunde inte skapas." },
      { status: 400 },
    );
  }
}
