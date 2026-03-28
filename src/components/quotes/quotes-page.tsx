import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { QuoteForm } from "@/components/quotes/quote-form";
import { formatCurrency } from "@/lib/invoicing";
import { getQuoteStatusTone } from "@/lib/quotes";

type QuotesPageProps = {
  companySlug: string;
  customerOptions: Array<{ label: string; value: string }>;
  quotes: Array<{
    id: string;
    quoteNumber: string;
    customerName: string;
    title: string;
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    totalGross: string;
    issueDate: string;
    validUntil: string | null;
  }>;
};

export function QuotesPage({ companySlug, customerOptions, quotes }: QuotesPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Offerter"
        title="Skapa offert, acceptera och koppla till projekt"
        description="Bygg ett tydligt kommersiellt underlag före projekt och fakturering."
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/workspace/${companySlug}/quotes/${quote.id}`} className="block">
              <Card className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{quote.quoteNumber}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{quote.customerName}</p>
                    <p className="mt-1 text-sm text-[var(--color-foreground)]">{quote.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={quote.statusLabel} tone={quote.statusTone} />
                    <StatusBadge label={formatCurrency(quote.totalGross)} tone="primary" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          <QuoteForm companySlug={companySlug} customerOptions={customerOptions} mode="create" />
          <Card className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Statusöversikt</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Offertutkast" tone={getQuoteStatusTone("DRAFT")} />
              <StatusBadge label="Skickad" tone={getQuoteStatusTone("SENT")} />
              <StatusBadge label="Accepterad" tone={getQuoteStatusTone("ACCEPTED")} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
