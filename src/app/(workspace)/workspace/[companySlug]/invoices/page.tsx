import { isInvoiceOverdue } from "@/lib/invoicing";
import { InvoicesPage } from "@/components/invoices/invoices-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceInvoicesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          lines: true,
        },
      },
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
  });

  return (
    <InvoicesPage
      companyName={viewer.company.name}
      companySlug={viewer.company.slug}
      invoices={invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceMode: invoice.invoiceMode,
        status: invoice.status,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        totalGross: invoice.totalGross.toString(),
        paidAmount: invoice.paidAmount.toString(),
        remainingAmount: invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount).toString(),
        isOverdue: isInvoiceOverdue(invoice),
        project: invoice.project,
        lineCount: invoice._count.lines,
      }))}
    />
  );
}
