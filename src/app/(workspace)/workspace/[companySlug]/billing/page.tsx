import { Prisma } from "@prisma/client";
import { BillingPage } from "@/components/billing/billing-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getProjectBillingSuggestion, getProjectBillingSummary } from "@/lib/billing";
import { isInvoiceOverdue } from "@/lib/invoicing";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

export default async function BillingWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [projects, invoices] = await Promise.all([
    prisma.project.findMany({
      where: { companyId: viewer.company.id },
      select: { id: true, title: true, customerName: true, status: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { companyId: viewer.company.id },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        status: true,
        totalGross: true,
        paidAmount: true,
        writtenOffAmount: true,
        dueDate: true,
        paymentDate: true,
      },
    }),
  ]);

  const projectSummaries = await Promise.all(
    projects.map(async (project) => ({
      project,
      summary: await getProjectBillingSummary(project.id, viewer.company.id),
    })),
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const overview = {
    invoicesSent: invoices.filter((invoice) => invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID" || invoice.status === "PAID").length.toString(),
    overdueInvoices: invoices.filter((invoice) => isInvoiceOverdue(invoice)).length,
    outstandingReceivables: invoices
      .filter((invoice) => invoice.status !== "CANCELLED")
      .reduce((sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount)), ZERO)
      .toString(),
    paidThisMonth: invoices
      .filter((invoice) => invoice.paymentDate && invoice.paymentDate >= monthStart)
      .reduce((sum, invoice) => sum.add(invoice.paidAmount), ZERO)
      .toString(),
    unbilledValue: projectSummaries.reduce((sum, item) => sum.add(item.summary.totalUnbilledValue), ZERO).toString(),
    readyToInvoiceCount: projectSummaries.filter((item) => item.summary.totalUnbilledValue.greaterThan(0)).length,
    expectedIncoming: invoices
      .filter((invoice) => invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID")
      .reduce((sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount)), ZERO)
      .toString(),
  };

  return (
    <BillingPage
      companySlug={companySlug}
      overview={overview}
      readyProjects={projectSummaries
        .filter((item) => item.summary.totalUnbilledValue.greaterThan(0))
        .sort((left, right) => Number(right.summary.totalUnbilledValue.sub(left.summary.totalUnbilledValue).toString()))
        .slice(0, 8)
        .map((item) => ({
          id: item.project.id,
          title: item.project.title,
          customerName: item.project.customerName,
          unbilledValue: item.summary.totalUnbilledValue.toString(),
          outstandingReceivables: item.summary.outstandingReceivables.toString(),
          suggestion: getProjectBillingSuggestion({
            projectStatus: item.project.status,
            totalUnbilledValue: item.summary.totalUnbilledValue,
            lastInvoiceDate: item.summary.lastInvoiceDate,
            invoiceCount: item.summary.invoiceCount,
          }),
        }))}
      recentInvoices={invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        status: invoice.status,
        totalGross: invoice.totalGross.toString(),
        remainingAmount: invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount).toString(),
        dueDate: invoice.dueDate.toISOString(),
        isOverdue: isInvoiceOverdue(invoice),
      }))}
    />
  );
}
