import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, getInvoiceStatusLabel, getInvoiceStatusTone } from "@/lib/invoicing";

type BillingPageProps = {
  companySlug: string;
  overview: {
    invoicesSent: string;
    overdueInvoices: number;
    outstandingReceivables: string;
    paidThisMonth: string;
    unbilledValue: string;
    readyToInvoiceCount: number;
    expectedIncoming: string;
  };
  readyProjects: Array<{
    id: string;
    title: string;
    customerName: string;
    unbilledValue: string;
    outstandingReceivables: string;
    suggestion: {
      action: string;
      label: string;
      reason: string;
    };
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    totalGross: string;
    remainingAmount: string;
    dueDate: string;
    isOverdue: boolean;
  }>;
};

export function BillingPage({ companySlug, overview, readyProjects, recentInvoices }: BillingPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Fakturering"
        title="Se vad som går att fakturera och vad som väntas in"
        description="Få en praktisk bild av fakturerbart arbete, kundfordringar och förväntat inflöde utan att lämna projektflödet."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Skickade fakturor</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{overview.invoicesSent}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Förfallna fakturor</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{overview.overdueInvoices}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Utestående kundfordringar</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(overview.outstandingReceivables)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Betalt den här månaden</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{formatCurrency(overview.paidThisMonth)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ofakturerat värde</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{formatCurrency(overview.unbilledValue)}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Förväntat inflöde</p>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{formatCurrency(overview.expectedIncoming)}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Redo att fakturera</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Projekt med fakturerbart underlag
              </h2>
            </div>
            <Link href={`/workspace/${companySlug}/billing/queue`} className="text-sm font-semibold text-[var(--color-primary)]">
              Öppna faktureringskö
            </Link>
          </div>

          {readyProjects.length === 0 ? (
            <EmptyState
              title="Inga projekt sticker ut just nu"
              description="När nytt fakturerbart arbete eller material kommer in syns projekten här."
            />
          ) : (
            <div className="space-y-3">
              {readyProjects.map((project) => (
                <Link key={project.id} href={`/workspace/${companySlug}/projects/${project.id}`} className="block rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-[var(--color-foreground)]">{project.title}</p>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{project.customerName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={project.suggestion.label} tone="accent" />
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">{project.suggestion.reason}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-[var(--color-foreground)]">{formatCurrency(project.unbilledValue)}</p>
                      <p className="text-[var(--color-muted-foreground)]">Utestående {formatCurrency(project.outstandingReceivables)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Kundfordringar</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Senaste fakturaflödet
            </h2>
          </div>
          <div className="space-y-3">
            {recentInvoices.map((invoice) => (
              <Link key={invoice.id} href={`/workspace/${companySlug}/invoices/${invoice.id}`} className="block rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{invoice.customerName}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Förfallodatum {invoice.dueDate.slice(0, 10)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge
                      label={invoice.isOverdue ? "Förfallen" : getInvoiceStatusLabel(invoice.status)}
                      tone={invoice.isOverdue ? "danger" : getInvoiceStatusTone(invoice.status)}
                    />
                    <StatusBadge label={formatCurrency(invoice.remainingAmount)} tone={invoice.isOverdue ? "danger" : "primary"} />
                  </div>
                </div>
              </Link>
            ))}
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Inga fakturor skapade ännu.</p>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
