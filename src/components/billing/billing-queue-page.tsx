import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/invoicing";

type BillingQueuePageProps = {
  companySlug: string;
  items: Array<{
    projectId: string;
    title: string;
    customerName: string;
    unbilledAmount: string;
    lastInvoiceDate: string | null;
    statusLabel: string;
    suggestion: {
      action: string;
      label: string;
      reason: string;
    };
  }>;
};

export function BillingQueuePage({ companySlug, items }: BillingQueuePageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Faktureringskö"
        title="Se vad som bör faktureras härnäst"
        description="Sortera projekten efter fakturerbart värde, senaste faktura och nästa rekommenderade åtgärd."
      />

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.projectId} className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{item.customerName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={item.statusLabel} tone="accent" />
                  <StatusBadge label={item.suggestion.label} tone="primary" />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">{item.suggestion.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Ofakturerat</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{formatCurrency(item.unbilledAmount)}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {item.lastInvoiceDate ? `Senast fakturerad ${item.lastInvoiceDate}` : "Ingen faktura ännu"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/workspace/${companySlug}/projects/${item.projectId}`} className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
                Öppna projekt
              </Link>
              <Link href={`/workspace/${companySlug}/projects/${item.projectId}`} className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-foreground)]">
                {item.suggestion.action}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
