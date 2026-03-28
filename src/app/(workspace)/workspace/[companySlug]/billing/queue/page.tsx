import { BillingQueuePage } from "@/components/billing/billing-queue-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getProjectBillingSuggestion, getProjectBillingSummary } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export default async function BillingQueueWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const projects = await prisma.project.findMany({
    where: {
      companyId: viewer.company.id,
    },
    select: {
      id: true,
      title: true,
      customerName: true,
      status: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const items = await Promise.all(
    projects.map(async (project) => {
      const summary = await getProjectBillingSummary(project.id, viewer.company.id);
      const suggestion = getProjectBillingSuggestion({
        projectStatus: project.status,
        totalUnbilledValue: summary.totalUnbilledValue,
        lastInvoiceDate: summary.lastInvoiceDate,
        invoiceCount: summary.invoiceCount,
      });

      return {
        projectId: project.id,
        title: project.title,
        customerName: project.customerName,
        unbilledAmount: summary.totalUnbilledValue.toString(),
        lastInvoiceDate: summary.lastInvoiceDate?.toISOString().slice(0, 10) ?? null,
        statusLabel:
          summary.totalUnbilledValue.greaterThan(0)
            ? summary.invoiceCount > 0
              ? "Delvis fakturerad"
              : "Redo att fakturera"
            : "Ingen aktivitet",
        suggestion,
      };
    }),
  );

  return <BillingQueuePage companySlug={companySlug} items={items.filter((item) => Number(item.unbilledAmount) > 0)} />;
}
