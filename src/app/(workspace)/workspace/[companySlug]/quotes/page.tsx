import { QuotesPage } from "@/components/quotes/quotes-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getQuoteStatusTone, quoteStatusLabels } from "@/lib/quotes";
import { prisma } from "@/lib/prisma";

export default async function QuotesWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [quotes, customers] = await Promise.all([
    prisma.quote.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.customer.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <QuotesPage
      companySlug={companySlug}
      customerOptions={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
      quotes={quotes.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerName: quote.customer.name,
        title: quote.title,
        statusLabel: quoteStatusLabels[quote.status],
        statusTone: getQuoteStatusTone(quote.status),
        totalGross: quote.totalGross.toString(),
        issueDate: quote.issueDate.toISOString().slice(0, 10),
        validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? null,
      }))}
    />
  );
}
