import { CustomerPaymentsPage } from "@/components/accounting/customer-payments-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import {
  customerPaymentStatusLabels,
  getCustomerPaymentStatusTone,
} from "@/lib/customer-payments";
import { prisma } from "@/lib/prisma";

export default async function AccountingPaymentsPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const payments = await prisma.customerPayment.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          customerName: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return (
    <CustomerPaymentsPage
      companySlug={companySlug}
      payments={payments.map((payment) => ({
        id: payment.id,
        date: payment.date,
        amount: payment.amount.toString(),
        reference: payment.reference,
        statusLabel: customerPaymentStatusLabels[payment.status],
        statusTone: getCustomerPaymentStatusTone(payment.status),
        invoiceNumber: payment.invoice?.invoiceNumber ?? null,
        customerName: payment.invoice?.customerName ?? null,
      }))}
    />
  );
}
