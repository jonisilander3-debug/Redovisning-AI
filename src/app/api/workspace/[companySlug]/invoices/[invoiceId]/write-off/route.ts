import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { createInvoiceWriteOffSchema, createInvoiceWriteOff } from "@/lib/receivables";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; invoiceId: string }>;
  },
) {
  const { companySlug, invoiceId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can write off invoices." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createInvoiceWriteOffSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the write-off details first." },
      { status: 400 },
    );
  }

  const date = new Date(result.data.date);

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { message: "Choose a valid write-off date." },
      { status: 400 },
    );
  }

  try {
    const writeOff = await createInvoiceWriteOff({
      companyId: viewer.company.id,
      invoiceId,
      date,
      amount: result.data.amount,
      reason: result.data.reason || null,
    });

    return NextResponse.json({ ok: true, writeOffId: writeOff.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "We could not write off that invoice.",
      },
      { status: 400 },
    );
  }
}
