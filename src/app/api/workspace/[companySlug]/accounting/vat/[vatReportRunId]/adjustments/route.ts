import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { createVatAdjustmentSchema, createVatAdjustment } from "@/lib/vat-corrections";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string; vatReportRunId: string }> },
) {
  const { companySlug, vatReportRunId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const json = await request.json();
  const result = createVatAdjustmentSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Complete the VAT correction details first." },
      { status: 400 },
    );
  }

  const date = new Date(result.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Choose a valid correction date." }, { status: 400 });
  }

  try {
    const adjustment = await createVatAdjustment({
      companyId: viewer.company.id,
      vatReportRunId,
      date,
      description: result.data.description,
      outputVatDelta: result.data.outputVatDelta,
      inputVatDelta: result.data.inputVatDelta,
    });

    return NextResponse.json({ ok: true, vatAdjustmentId: adjustment.id });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "VAT correction could not be created.",
      },
      { status: 400 },
    );
  }
}
