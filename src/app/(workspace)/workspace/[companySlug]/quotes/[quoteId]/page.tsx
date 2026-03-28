import { notFound } from "next/navigation";
import { QuoteDetailPage } from "@/components/quotes/quote-detail-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getQuoteCommercialSummary, getQuoteStatusTone, quoteStatusLabels } from "@/lib/quotes";
import { prisma } from "@/lib/prisma";

export default async function QuoteDetailWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string; quoteId: string }>;
}) {
  const { companySlug, quoteId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [quote, customers] = await Promise.all([
    prisma.quote.findFirst({
      where: {
        id: quoteId,
        companyId: viewer.company.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        lines: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
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

  if (!quote) {
    notFound();
  }

  const commercialSummary = await getQuoteCommercialSummary(quoteId, viewer.company.id);

  return (
    <QuoteDetailPage
      companySlug={companySlug}
      customerOptions={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
      quote={{
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        customerId: quote.customer.id,
        customerName: quote.customer.name,
        status: quote.status,
        statusLabel: quoteStatusLabels[quote.status],
        statusTone: getQuoteStatusTone(quote.status),
        title: quote.title,
        description: quote.description ?? "",
        issueDate: quote.issueDate.toISOString().slice(0, 10),
        validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? "",
        totalNet: quote.totalNet.toString(),
        totalVat: quote.totalVat.toString(),
        totalGross: quote.totalGross.toString(),
        acceptedAt: quote.acceptedAt?.toISOString() ?? null,
        projectId: quote.projectId,
        lines: quote.lines.map((line) => ({
          id: line.id,
          type: line.type,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          vatRate: line.vatRate.toString(),
          sortOrder: line.sortOrder,
        })),
      }}
      commercialSummary={{
        quotedGross: commercialSummary.quotedGross.toString(),
        billedGross: commercialSummary.billedGross.toString(),
        paidGross: commercialSummary.paidGross.toString(),
        outstandingGross: commercialSummary.outstandingGross.toString(),
        remainingGross: commercialSummary.remainingGross.toString(),
      }}
    />
  );
}
