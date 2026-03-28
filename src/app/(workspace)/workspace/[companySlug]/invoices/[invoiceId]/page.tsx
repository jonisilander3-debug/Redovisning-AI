import { notFound } from "next/navigation";
import { InvoiceDetailPage } from "@/components/invoices/invoice-detail-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import {
  customerPaymentStatusLabels,
  getCustomerPaymentStatusTone,
} from "@/lib/customer-payments";
import { isInvoiceOverdue } from "@/lib/invoicing";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceInvoiceDetailPage({
  params,
}: {
  params: Promise<{ companySlug: string; invoiceId: string }>;
}) {
  const { companySlug, invoiceId } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId: viewer.company.id,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          customerName: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          contactPerson: true,
          email: true,
          phone: true,
        },
      },
      customerPayments: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      creditNoteOf: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
      creditNotes: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalGross: true,
        },
      },
      writeOffs: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          date: true,
          amount: true,
          reason: true,
        },
      },
      lines: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceDetailPage
      companySlug={viewer.company.slug}
      invoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customer: invoice.customer,
        invoiceMode: invoice.invoiceMode,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        billingPeriodStart: invoice.billingPeriodStart,
        billingPeriodEnd: invoice.billingPeriodEnd,
        totalNet: invoice.totalNet.toString(),
        totalVat: invoice.totalVat.toString(),
        totalGross: invoice.totalGross.toString(),
        paidAmount: invoice.paidAmount.toString(),
        writtenOffAmount: invoice.writtenOffAmount.toString(),
        remainingAmount: invoice.totalGross
          .sub(invoice.paidAmount)
          .sub(invoice.writtenOffAmount)
          .toString(),
        paymentDate: invoice.paymentDate,
        paymentReference: invoice.paymentReference,
        isOverdue: isInvoiceOverdue(invoice),
        isCreditNote: invoice.isCreditNote,
        creditNoteOf: invoice.creditNoteOf
          ? {
              id: invoice.creditNoteOf.id,
              invoiceNumber: invoice.creditNoteOf.invoiceNumber,
            }
          : null,
        project: invoice.project,
        lines: invoice.lines.map((line) => ({
          id: line.id,
          type: line.type,
          sourceType: line.sourceType,
          sourceId: line.sourceId,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          vatRate: line.vatRate.toString(),
          totalNet: line.totalNet.toString(),
          totalVat: line.totalVat.toString(),
          totalGross: line.totalGross.toString(),
        })),
        payments: invoice.customerPayments.map((payment) => ({
          id: payment.id,
          date: payment.date,
          amount: payment.amount.toString(),
          statusLabel: customerPaymentStatusLabels[payment.status],
          tone: getCustomerPaymentStatusTone(payment.status),
          reference: payment.reference,
        })),
        creditNotes: invoice.creditNotes.map((creditNote) => ({
          id: creditNote.id,
          invoiceNumber: creditNote.invoiceNumber,
          status: creditNote.status,
          totalGross: creditNote.totalGross.toString(),
        })),
        writeOffs: invoice.writeOffs.map((writeOff) => ({
          id: writeOff.id,
          date: writeOff.date,
          amount: writeOff.amount.toString(),
          reason: writeOff.reason,
        })),
      }}
    />
  );
}
