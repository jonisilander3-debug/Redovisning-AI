import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatAccountingAmount,
  journalSourceTypeLabels,
} from "@/lib/accounting";
import { formatDateLabel } from "@/lib/time-tracking";

type AccountingJournalPageProps = {
  entries: Array<{
    id: string;
    date: Date;
    description: string;
    sourceType:
      | "INVOICE"
      | "MATERIAL"
      | "PAYROLL"
      | "CUSTOMER_PAYMENT"
      | "WRITE_OFF"
      | "YEAR_END"
      | "MANUAL";
    statusLabel: string;
    statusTone: "default" | "primary" | "accent" | "success" | "danger";
    lines: Array<{
      id: string;
      debit: string;
      credit: string;
      description: string | null;
      account: {
        number: string;
        name: string;
      };
    }>;
  }>;
};

export function AccountingJournalPage({ entries }: AccountingJournalPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Journal"
        title="Verifikationer och kontorader"
        description="Folj bokforingen rad for rad med tydliga debet- och kreditposter."
      />

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="space-y-4 bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-foreground)]">
                  {entry.description}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDateLabel(entry.date)} - {journalSourceTypeLabels[entry.sourceType]}
                </p>
              </div>
              <StatusBadge label={entry.statusLabel} tone={entry.statusTone} />
            </div>

            <div className="space-y-2">
              {entry.lines.map((line) => (
                <div
                  key={line.id}
                  className="grid gap-3 rounded-[18px] bg-[var(--color-surface)] px-4 py-3 sm:grid-cols-[1.1fr_0.45fr_0.45fr]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      {line.account.number} - {line.account.name}
                    </p>
                    {line.description ? (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {line.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm text-[var(--color-foreground)] sm:text-right">
                    {line.debit !== "0" ? formatAccountingAmount(line.debit) : "-"}
                  </div>
                  <div className="text-sm text-[var(--color-foreground)] sm:text-right">
                    {line.credit !== "0" ? formatAccountingAmount(line.credit) : "-"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {entries.length === 0 ? (
          <Card className="space-y-3">
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              Inga verifikationer an
            </p>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              Skicka en faktura eller bokfor ett materialunderlag for att skapa den forsta verifikationen.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
