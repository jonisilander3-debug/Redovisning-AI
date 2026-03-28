import { NextResponse } from "next/server";
import { requireCompanyTimeAccess } from "@/lib/access";
import { createVatReportRun, createVatReportSchema } from "@/lib/vat-reporting";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const json = await request.json();
  const result = createVatReportSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid VAT period first." },
      { status: 400 },
    );
  }

  const periodStart = new Date(result.data.periodStart);
  const periodEnd = new Date(result.data.periodEnd);

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json(
      { message: "Choose a valid VAT period." },
      { status: 400 },
    );
  }

  try {
    const report = await createVatReportRun(
      viewer.company.id,
      periodStart,
      periodEnd,
      result.data.correctionOfVatReportRunId || null,
    );
    return NextResponse.json({ ok: true, vatReportRunId: report.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that VAT report.",
      },
      { status: 400 },
    );
  }
}
