import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { buildInvoiceDraftPreview, invoiceDraftSchema, parseOptionalDate } from "@/lib/billing";

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
    return NextResponse.json({ message: "Only company managers can build invoice drafts." }, { status: 403 });
  }

  const result = invoiceDraftSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json({ message: "Kontrollera fakturaunderlaget och forsok igen." }, { status: 400 });
  }

  try {
    const preview = await buildInvoiceDraftPreview(result.data.projectId, {
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

    return NextResponse.json({
      preview: {
        ...preview,
        issueDate: preview.issueDate.toISOString(),
        dueDate: preview.dueDate.toISOString(),
        billingPeriodStart: preview.billingPeriodStart?.toISOString() ?? null,
        billingPeriodEnd: preview.billingPeriodEnd?.toISOString() ?? null,
        totalNet: preview.totalNet.toString(),
        totalVat: preview.totalVat.toString(),
        totalGross: preview.totalGross.toString(),
        lines: preview.lines.map((line) => ({
          ...line,
          date: line.date.toISOString(),
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          vatRate: line.vatRate.toString(),
          totalNet: line.totalNet.toString(),
          totalVat: line.totalVat.toString(),
          totalGross: line.totalGross.toString(),
          remainingQuantity: line.remainingQuantity.toString(),
        })),
        groupedLines: preview.groupedLines.map((group) => ({
          ...group,
          date: group.date.toISOString(),
          lines: group.lines.map((line) => ({
            ...line,
            date: line.date.toISOString(),
            quantity: line.quantity.toString(),
            unitPrice: line.unitPrice.toString(),
            vatRate: line.vatRate.toString(),
            totalNet: line.totalNet.toString(),
            totalVat: line.totalVat.toString(),
            totalGross: line.totalGross.toString(),
            remainingQuantity: line.remainingQuantity.toString(),
          })),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Fakturautkastet kunde inte byggas." },
      { status: 400 },
    );
  }
}
