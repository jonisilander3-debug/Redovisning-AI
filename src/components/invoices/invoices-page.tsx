import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  invoiceModeDisplayLabels,
} from "@/lib/invoicing";
import { formatDateLabel } from "@/lib/time-tracking";

type InvoicesPageProps = {
  companyName: string;
  companySlug: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerId: string | null;
    customerName: string;
    invoiceMode: "PROJECT_FINAL" | "PERIODIC" | "MANUAL_PROGRESS";
    status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    dueDate: Date;
    issueDate: Date;
    totalGross: string;
    paidAmount: string;
    remainingAmount: string;
    isOverdue: boolean;
    project: {
      id: string;
      title: string;
    } | null;
    lineCount: number;
  }>;
};

export function InvoicesPage({
  companyName,
  companySlug,
  invoices,
}: InvoicesPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Fakturor"
        title="Fånga fakturaflödet på ett ställe"
        description={`${companyName} kan nu följa fakturautkast, skickade fakturor, delbetalningar och det som återstår att få in.`}
      />

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <a
            key={invoice.id}
            href={`/workspace/${companySlug}/invoices/${invoice.id}`}
            className="block"
          >
            <Card className="space-y-4 bg-white p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-foreground)]">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{invoice.customerName}</p>
                  <p className="text-sm text-[var(--color-foreground)]">
                    {invoice.project?.title ?? "Ingen projektkoppling"}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {invoiceModeDisplayLabels[invoice.invoiceMode]} · Betalt {formatCurrency(invoice.paidAmount)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={invoice.isOverdue ? "Förfallen" : getInvoiceStatusLabel(invoice.status)}
                    tone={invoice.isOverdue ? "danger" : getInvoiceStatusTone(invoice.status)}
                  />
                  <StatusBadge label={formatCurrency(invoice.totalGross)} tone="primary" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Fakturadatum
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">
                    {formatDateLabel(invoice.issueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Förfallodatum
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">
                    {formatDateLabel(invoice.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Återstår
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-foreground)]">
                    {formatCurrency(invoice.remainingAmount)}
                  </p>
                </div>
              </div>
            </Card>
          </a>
        ))}

        {invoices.length === 0 ? (
          <Card className="space-y-3">
            <p className="text-lg font-semibold text-[var(--color-foreground)]">Inga fakturor ännu</p>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              Skapa den första fakturan direkt från ett projekt när tid eller material är redo att fakturera.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
