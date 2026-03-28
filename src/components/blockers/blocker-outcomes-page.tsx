import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getBlockerOutcomeStatusLabel,
  getBlockerOutcomeStatusTone,
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
} from "@/lib/blockers";

type BlockerOutcomesPageProps = {
  companySlug: string;
  companyName: string;
  blockers: Array<{
    id: string;
    title: string;
    projectId: string;
    projectTitle: string;
    taskTitle: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    outcomeStatus: "UNVERIFIED" | "RESOLVED_CONFIRMED" | "RESOLVED_PARTIAL" | "REOPENED";
    outcomeSummary: string | null;
    verifiedByName: string | null;
    verifiedAt: string | null;
    reopenedAt: string | null;
    reopenReason: string | null;
    recurrenceCount: number;
  }>;
};

export function BlockerOutcomesPage({
  companySlug,
  companyName,
  blockers,
}: BlockerOutcomesPageProps) {
  const summary = {
    confirmed: blockers.filter((blocker) => blocker.outcomeStatus === "RESOLVED_CONFIRMED").length,
    partial: blockers.filter((blocker) => blocker.outcomeStatus === "RESOLVED_PARTIAL").length,
    reopened: blockers.filter((blocker) => blocker.outcomeStatus === "REOPENED").length,
    recurring: blockers.filter((blocker) => blocker.recurrenceCount > 1).length,
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Outcomes"
        title="See whether blocker fixes actually held"
        description={`${companyName} can now review which fixes stayed resolved, which only partly worked, and which blockers came back again.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Confirmed fixed</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{summary.confirmed}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Partial outcomes</p>
          <p className="text-2xl font-semibold text-[var(--color-accent)]">{summary.partial}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Reopened</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.reopened}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Recurring patterns</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{summary.recurring}</p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Outcome overview</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            What held, what drifted, and what came back
          </h2>
        </div>

        <div className="space-y-4">
          {blockers.length > 0 ? (
            blockers.map((blocker) => (
              <Card key={blocker.id} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[var(--color-foreground)]">
                        {blocker.title}
                      </p>
                      <StatusBadge
                        label={getBlockerSeverityLabel(blocker.severity)}
                        tone={getBlockerSeverityTone(blocker.severity)}
                      />
                      <StatusBadge
                        label={getBlockerOutcomeStatusLabel(blocker.outcomeStatus)}
                        tone={getBlockerOutcomeStatusTone(blocker.outcomeStatus)}
                      />
                      {blocker.recurrenceCount > 1 ? (
                        <StatusBadge label={`Seen ${blocker.recurrenceCount} times`} tone="danger" />
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {blocker.projectTitle} | {blocker.taskTitle}
                    </p>
                  </div>
                  <Link
                    href={`/workspace/${companySlug}/projects/${blocker.projectId}`}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
                  >
                    Open project
                  </Link>
                </div>

                {blocker.outcomeSummary ? (
                  <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                    {blocker.outcomeSummary}
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Verified by</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.verifiedByName || "Not verified yet"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Verified at</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.verifiedAt || "No verification yet"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Reopened at</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.reopenedAt || "No reopen"}
                    </p>
                  </div>
                </div>

                {blocker.reopenReason ? (
                  <div className="rounded-[18px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                    Reopen reason: {blocker.reopenReason}
                  </div>
                ) : null}
              </Card>
            ))
          ) : (
            <Card>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No blocker outcomes have been recorded yet.
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
