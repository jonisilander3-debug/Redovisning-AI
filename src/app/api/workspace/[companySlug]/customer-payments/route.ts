import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  createCustomerPaymentSchema,
  registerCustomerPayment,
} from "@/lib/customer-payments";

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
      { message: "Only company managers can register customer payments." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createCustomerPaymentSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the payment details first." },
      { status: 400 },
    );
  }

  const date = new Date(result.data.date);

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { message: "Choose a valid payment date." },
      { status: 400 },
    );
  }

  try {
    const payment = await registerCustomerPayment({
      companyId: viewer.company.id,
      invoiceId: result.data.invoiceId || null,
      date,
      amount: result.data.amount,
      reference: result.data.reference || null,
    });

    return NextResponse.json({ ok: true, paymentId: payment.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not register that payment.",
      },
      { status: 400 },
    );
  }
}
