import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { CustomerDetailPage } from "@/components/customers/customer-detail-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { isInvoiceOverdue } from "@/lib/invoicing";
import { prisma } from "@/lib/prisma";
import { getQuoteStatusTone, quoteStatusLabels } from "@/lib/quotes";

const ZERO = new Prisma.Decimal(0);

export default async function CustomerDetailWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string; customerId: string }>;
}) {
  const { companySlug, customerId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      companyId: viewer.company.id,
    },
    include: {
      quotes: {
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      },
      invoices: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        include: {
          project: {
            select: {
              title: true,
            },
          },
        },
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const totalBilled = customer.invoices.reduce((sum, invoice) => sum.add(invoice.totalGross), ZERO);
  const totalQuoted = customer.quotes.reduce((sum, quote) => sum.add(quote.totalGross), ZERO);
  const totalPaid = customer.invoices.reduce((sum, invoice) => sum.add(invoice.paidAmount), ZERO);
  const outstanding = customer.invoices.reduce(
    (sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount)),
    ZERO,
  );
  const overdue = customer.invoices.reduce((sum, invoice) => {
    if (!isInvoiceOverdue(invoice)) {
      return sum;
    }
    return sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount));
  }, ZERO);

  return (
    <CustomerDetailPage
      companySlug={companySlug}
      customer={{
        id: customer.id,
        name: customer.name,
        organizationNumber: customer.organizationNumber,
        contactPerson: customer.contactPerson,
        email: customer.email,
        phone: customer.phone,
        addressLine1: customer.addressLine1,
        postalCode: customer.postalCode,
        city: customer.city,
        totalQuoted: totalQuoted.toString(),
        totalBilled: totalBilled.toString(),
        totalPaid: totalPaid.toString(),
        outstanding: outstanding.toString(),
        overdue: overdue.toString(),
        quotes: customer.quotes.map((quote) => ({
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          statusLabel: quoteStatusLabels[quote.status],
          statusTone: getQuoteStatusTone(quote.status),
          totalGross: quote.totalGross.toString(),
          projectId: quote.projectId,
        })),
        invoices: customer.invoices.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          totalGross: invoice.totalGross.toString(),
          paidAmount: invoice.paidAmount.toString(),
          remainingAmount: invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount).toString(),
          isOverdue: isInvoiceOverdue(invoice),
          projectTitle: invoice.project?.title ?? null,
        })),
      }}
    />
  );
}
