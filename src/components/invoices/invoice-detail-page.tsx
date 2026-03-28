import { InvoiceLineType } from "@prisma/client";
import Link from "next/link";
import { InvoicePaymentForm } from "@/components/invoices/invoice-payment-form";
import { InvoiceReceivablesActions } from "@/components/invoices/invoice-receivables-actions";
import { InvoiceStatusActions } from "@/components/invoices/invoice-status-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
  invoiceModeDisplayLabels,
  invoiceLineTypeLabels,
} from "@/lib/invoicing";
import { formatDateLabel } from "@/lib/time-tracking";

type InvoiceDetailPageProps = {
  companySlug: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customer: {
      id: string;
      name: string;
      contactPerson: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    invoiceMode: "PROJECT_FINAL" | "PERIODIC" | "MANUAL_PROGRESS";
    status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    issueDate: Date;
    dueDate: Date;
    billingPeriodStart: Date | null;
    billingPeriodEnd: Date | null;
    totalNet: string;
    totalVat: string;
    totalGross: string;
    paidAmount: string;
    writtenOffAmount: string;
    remainingAmount: string;
    paymentDate: Date | null;
    paymentReference: string | null;
    isOverdue: boolean;
    isCreditNote: boolean;
    creditNoteOf: {
      id: string;
      invoiceNumber: string;
    } | null;
    project: {
      id: string;
      title: string;
      customerName: string;
    } | null;
    lines: Array<{
      id: string;
      type: InvoiceLineType;
      sourceType: "TIME" | "MATERIAL" | null;
      sourceId: string | null;
      description: string;
      quantity: string;
      unitPrice: string;
      vatRate: string;
      totalNet: string;
      totalVat: string;
      totalGross: string;
    }>;
    payments: Array<{
      id: string;
      date: Date;
      amount: string;
      statusLabel: string;
      tone: "default" | "primary" | "accent" | "success" | "danger";
      reference: string | null;
    }>;
    creditNotes: Array<{
      id: string;
      invoiceNumber: string;
      status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
      totalGross: string;
    }>;
    writeOffs: Array<{
      id: string;
      date: Date;
      amount: string;
      reason: string | null;
    }>;
  };
};

export function InvoiceDetailPage({
  companySlug,
  invoice,
}: InvoiceDetailPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={invoice.customerName}
        title={invoice.isCreditNote ? `Kreditnota ${invoice.invoiceNumber}` : `Faktura ${invoice.invoiceNumber}`}
        description={invoice.project?.title ?? "Faktura utan kopplat projekt."}
        actions={
          <StatusBadge
            label={invoice.isOverdue ? "Förfallen" : getInvoiceStatusLabel(invoice.status)}
            tone={invoice.isOverdue ? "danger" : getInvoiceStatusTone(invoice.status)}
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturarader</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Fakturerat arbete och material
            </h2>
          </div>

          <div className="space-y-3">
            {invoice.lines.map((line) => (
              <div key={line.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--color-foreground)]">{line.description}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {line.quantity} × {formatCurrency(line.unitPrice)} · Moms {line.vatRate}%
                    </p>
                    {line.sourceType && line.sourceId && invoice.project ? (
                      <Link
                        href={`/workspace/${companySlug}/projects/${invoice.project.id}?sourceType=${line.sourceType}&sourceId=${line.sourceId}`}
                        className="text-xs font-medium text-[var(--color-primary)]"
                      >
                        Öppna ursprungsrad
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={invoiceLineTypeLabels[line.type]} tone="accent" />
                    <StatusBadge label={formatCurrency(line.totalGross)} tone="primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturastatus</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Håll koll på betalning och kundfordran
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturadatum</p>
              <p className="mt-2 font-semibold text-[var(--color-foreground)]">{formatDateLabel(invoice.issueDate)}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Förfallodatum</p>
              <p className="mt-2 font-semibold text-[var(--color-foreground)]">{formatDateLabel(invoice.dueDate)}</p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturaläge</p>
              <p className="mt-2 font-semibold text-[var(--color-foreground)]">
                {invoiceModeDisplayLabels[invoice.invoiceMode]}
              </p>
            </div>
            <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Återstår</p>
              <p className="mt-2 font-semibold text-[var(--color-foreground)]">
                {formatCurrency(invoice.remainingAmount)}
              </p>
            </div>
            {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4 sm:col-span-2">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Fakturerad period</p>
                <p className="mt-2 font-semibold text-[var(--color-foreground)]">
                  {formatDateLabel(invoice.billingPeriodStart)} - {formatDateLabel(invoice.billingPeriodEnd)}
                </p>
              </div>
            ) : null}
          </div>

          {invoice.customer ? (
            <div className="rounded-[22px] bg-[var(--color-surface)] p-5">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Kund</p>
              <p className="mt-2 text-base font-semibold text-[var(--color-foreground)]">{invoice.customer.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {invoice.customer.contactPerson || invoice.customer.email || invoice.customer.phone || "Inga kontaktuppgifter sparade"}
              </p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[22px] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Netto</span>
              <span>{formatCurrency(invoice.totalNet)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Moms</span>
              <span>{formatCurrency(invoice.totalVat)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-base font-semibold text-[var(--color-foreground)]">
              <span>Brutto</span>
              <span>{formatCurrency(invoice.totalGross)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Betalt</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Avskrivet</span>
              <span>{formatCurrency(invoice.writtenOffAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Kvar att få in</span>
              <span>{formatCurrency(invoice.remainingAmount)}</span>
            </div>
          </div>

          {invoice.creditNoteOf ? (
            <div className="rounded-[22px] bg-[var(--color-surface)] p-5">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Kreditnoterelation</p>
              <p className="mt-2 text-sm text-[var(--color-foreground)]">
                Den här kreditnotan korrigerar{" "}
                <Link href={`/workspace/${companySlug}/invoices/${invoice.creditNoteOf.id}`} className="font-semibold text-[var(--color-primary)]">
                  {invoice.creditNoteOf.invoiceNumber}
                </Link>
                .
              </p>
            </div>
          ) : null}

          <InvoiceStatusActions companySlug={companySlug} invoiceId={invoice.id} status={invoice.status} />

          {invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID" ? (
            <div className="space-y-4 rounded-[22px] bg-[var(--color-surface)] p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Registrera betalning</p>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Matcha inbetalning från kund
                </h3>
              </div>
              <InvoicePaymentForm companySlug={companySlug} invoiceId={invoice.id} />
            </div>
          ) : null}

          {!invoice.isCreditNote && (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") ? (
            <InvoiceReceivablesActions
              companySlug={companySlug}
              invoiceId={invoice.id}
              remainingAmount={invoice.remainingAmount}
            />
          ) : null}

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Betalningshistorik</p>
            </div>
            {invoice.payments.map((payment) => (
              <div key={payment.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{formatDateLabel(payment.date)}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {payment.reference ?? "Ingen betalningsreferens"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={payment.statusLabel} tone={payment.tone} />
                    <StatusBadge label={formatCurrency(payment.amount)} tone="primary" />
                  </div>
                </div>
              </div>
            ))}
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Ingen kundbetalning är registrerad ännu.</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Relaterade kreditnotor</p>
            </div>
            {invoice.creditNotes.map((creditNote) => (
              <Link
                key={creditNote.id}
                href={`/workspace/${companySlug}/invoices/${creditNote.id}`}
                className="block rounded-[20px] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{creditNote.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      Korrigerande dokument kopplat till den här kundfordran
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={getInvoiceStatusLabel(creditNote.status)} tone={getInvoiceStatusTone(creditNote.status)} />
                    <StatusBadge label={formatCurrency(creditNote.totalGross)} tone="primary" />
                  </div>
                </div>
              </Link>
            ))}
            {invoice.creditNotes.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Inga kreditnotor har skapats från den här fakturan ännu.</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Avskrivningar</p>
            </div>
            {invoice.writeOffs.map((writeOff) => (
              <div key={writeOff.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{formatDateLabel(writeOff.date)}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                      {writeOff.reason ?? "Ingen anteckning"}
                    </p>
                  </div>
                  <StatusBadge label={formatCurrency(writeOff.amount)} tone="danger" />
                </div>
              </div>
            ))}
            {invoice.writeOffs.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Ingen avskrivning är registrerad på fakturan.</p>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
