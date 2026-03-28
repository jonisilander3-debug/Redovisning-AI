import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { createYearEndAdjustmentSchema, createYearEndAdjustment } from "@/lib/year-end-adjustments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const json = await request.json();
  const result = createYearEndAdjustmentSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Complete the year-end adjustment first." },
      { status: 400 },
    );
  }

  const date = new Date(result.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ message: "Choose a valid booking date." }, { status: 400 });
  }

  try {
    const adjustment = await createYearEndAdjustment({
      companyId: viewer.company.id,
      year: result.data.year,
      type: result.data.type,
      date,
      description: result.data.description,
      amount: result.data.amount,
      debitAccountId: result.data.debitAccountId,
      creditAccountId: result.data.creditAccountId,
      note: result.data.note || null,
      status: result.data.status,
    });

    return NextResponse.json({ ok: true, adjustmentId: adjustment.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Year-end adjustment could not be created.",
      },
      { status: 400 },
    );
  }
}
