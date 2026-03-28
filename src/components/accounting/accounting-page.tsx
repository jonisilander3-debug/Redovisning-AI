import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAccountingAmount } from "@/lib/accounting";

type AccountingPageProps = {
  companySlug: string;
  companyName: string;
  summary: {
    journalEntryCount: number;
    pendingSuggestionCount: number;
    postedCount: number;
    draftOrReviewedCount: number;
    assetsTotal: string;
    resultTotal: string;
  };
  recentJournalEntries: Array<{
    id: string;
    description: string;
    date: Date;
    statusLabel: string;
    tone: "default" | "primary" | "accent" | "success" | "danger";
  }>;
  recentSuggestions: Array<{
    id: string;
    sourceLabel: string;
    reasoning: string | null;
    confidenceScore: number | null;
  }>;
};

export function AccountingPage({
  companySlug,
  companyName,
  summary,
  recentJournalEntries,
  recentSuggestions,
}: AccountingPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Accounting"
        title="Keep bookkeeping clear and reviewable"
        description={`${companyName} can now auto-book invoices, route unclear underlag to review, and stay ready for future AI-assisted posting.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Verifikationer
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {summary.journalEntryCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {summary.postedCount} bokforda och {summary.draftOrReviewedCount} under arbete.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Forslag som vantar
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {summary.pendingSuggestionCount}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Underlag som behover manuell granskning innan bokforing.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Tillgangar i balans
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {formatAccountingAmount(summary.assetsTotal)}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Sammanfattat fran nuvarande balansrakning.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Resultat hittills
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {formatAccountingAmount(summary.resultTotal)}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Intakter minus kostnader i bokforingen just nu.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Arbetsytor
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Ga vidare dar arbetet finns
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={`/workspace/${companySlug}/accounting/journal`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">Journal och huvudbok</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Se verifikationer, konton, debet och kredit i en ren journalvy.
              </p>
            </a>
            <a
              href={`/workspace/${companySlug}/accounting/suggestions`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">Forslag och granskning</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Hantera material- och loneunderlag som inte ska auto-bokforas direkt.
              </p>
            </a>
            <a
              href={`/workspace/${companySlug}/accounting/vat`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">Momsrapporter</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Sammanfatta utgaende och ingaende moms direkt fran bokforda verifikationer.
              </p>
            </a>
            <a
              href={`/workspace/${companySlug}/accounting/year-end`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">Arsbokslut och skatt</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Se resultat fore skatt, uppskattad bolagsskatt och skapa bokslutspost for skatt.
              </p>
            </a>
            <a
              href={`/workspace/${companySlug}/accounting/ink2`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">INK2-underlag</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Bygg radmappning mot deklarationsunderlag direkt fran bokforing och bokslutsposter.
              </p>
            </a>
            <a
              href={`/workspace/${companySlug}/accounting/payments`}
              className="block rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-foreground)]">Kundbetalningar</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Folj matchning mellan inbetalningar, fakturor och kundfordringar.
              </p>
            </a>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Senaste verifikationer
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Ny bokforingsaktivitet
              </h2>
            </div>
            <div className="space-y-3">
              {recentJournalEntries.map((entry) => (
                <div key={entry.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {entry.description}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {entry.date.toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <StatusBadge label={entry.statusLabel} tone={entry.tone} />
                  </div>
                </div>
              ))}
              {recentJournalEntries.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Inga verifikationer har skapats an.
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Senaste forslag
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Underlag som kan behova dig
              </h2>
            </div>
            <div className="space-y-3">
              {recentSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {suggestion.sourceLabel}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {suggestion.reasoning || "Forslaget har sparats for manuell granskning."}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[var(--color-muted-foreground)]">
                    Konfidens {suggestion.confidenceScore ? `${Math.round(suggestion.confidenceScore * 100)}%` : "saknas"}
                  </p>
                </div>
              ))}
              {recentSuggestions.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Inga bokforingsforslag vantar just nu.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
