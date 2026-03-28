import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ExecutionImprovementPanel } from "@/components/blockers/execution-improvement-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getPreventiveActionStatusLabel,
  getPreventiveActionStatusTone,
} from "@/lib/recurrence-prevention";
import {
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
} from "@/lib/blockers";

type RecurrenceOverviewPageProps = {
  companySlug: string;
  companyName: string;
  summary: {
    recurringPatterns: number;
    patternsWithoutPrevention: number;
    activePreventiveActions: number;
    overduePreventiveActions: number;
  };
  patterns: Array<{
    key: string;
    normalizedTitle: string;
    projectId: string;
    projectTitle: string;
    count: number;
    reopenedCount: number;
    highSeverityCount: number;
    activePreventiveActions: number;
    donePreventiveActions: number;
    missingPrevention: boolean;
    latestBlockers: Array<{
      id: string;
      title: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      taskTitle: string;
      createdAt: string;
    }>;
  }>;
  actions: Array<{
    id: string;
    title: string;
    status: "PROPOSED" | "ACTIVE" | "DONE";
    dueDate: string | null;
    projectId: string | null;
    projectTitle: string | null;
    ownerName: string | null;
    sourceBlockerTitle: string | null;
    overdue: boolean;
  }>;
  improvements: Array<{
    id: string;
    title: string;
    description: string;
    status: "PROPOSED" | "APPLIED" | "ARCHIVED";
    targetType: "TASK_GUIDANCE" | "CHECKLIST_ITEM";
    appliesToFutureTasks: boolean;
    projectTitle: string | null;
    sourcePreventiveActionTitle: string | null;
  }>;
  projectOptions: Array<{ label: string; value: string }>;
  preventiveActionOptions: Array<{ label: string; value: string }>;
};

export function RecurrenceOverviewPage({
  companySlug,
  companyName,
  summary,
  patterns,
  actions,
  improvements,
  projectOptions,
  preventiveActionOptions,
}: RecurrenceOverviewPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Prevention"
        title="Reduce repeated blockers over time"
        description={`${companyName} can now spot recurring issues, see where prevention is missing, and track process improvements that should keep delivery cleaner next time.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Recurring patterns</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{summary.recurringPatterns}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Missing prevention</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.patternsWithoutPrevention}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Active actions</p>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{summary.activePreventiveActions}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Overdue actions</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.overduePreventiveActions}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Recurring blocker patterns
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Where similar blockers keep coming back
            </h2>
          </div>

          <div className="space-y-4">
            {patterns.length > 0 ? (
              patterns.map((pattern) => (
                <div key={pattern.key} className="rounded-[22px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-[var(--color-foreground)]">
                          {pattern.latestBlockers[0]?.title || pattern.normalizedTitle}
                        </p>
                        <StatusBadge label={`${pattern.count} times`} tone="danger" />
                        {pattern.reopenedCount > 0 ? (
                          <StatusBadge label={`${pattern.reopenedCount} reopened`} tone="danger" />
                        ) : null}
                        {pattern.activePreventiveActions > 0 ? (
                          <StatusBadge label={`${pattern.activePreventiveActions} active actions`} tone="primary" />
                        ) : null}
                        {pattern.missingPrevention ? (
                          <StatusBadge label="Needs prevention" tone="accent" />
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {pattern.projectTitle}
                      </p>
                    </div>
                    <Link
                      href={`/workspace/${companySlug}/projects/${pattern.projectId}`}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
                    >
                      Open project
                    </Link>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pattern.latestBlockers.slice(0, 3).map((blocker) => (
                      <div key={blocker.id} className="rounded-[18px] bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--color-foreground)]">
                            {blocker.title}
                          </p>
                          <StatusBadge
                            label={getBlockerSeverityLabel(blocker.severity)}
                            tone={getBlockerSeverityTone(blocker.severity)}
                          />
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {blocker.taskTitle} | {blocker.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No recurring blocker patterns have been detected yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Preventive actions
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              What the team is doing differently
            </h2>
          </div>

          <div className="space-y-3">
            {actions.length > 0 ? (
              actions.map((action) => (
                <div key={action.id} className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {action.title}
                    </p>
                    <StatusBadge
                      label={getPreventiveActionStatusLabel(action.status)}
                      tone={getPreventiveActionStatusTone(action.status)}
                    />
                    {action.overdue ? (
                      <StatusBadge label="Overdue" tone="danger" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                    {action.projectTitle || "Company-wide"}{action.ownerName ? ` | ${action.ownerName}` : ""}
                  </p>
                  {action.dueDate ? (
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      Due {action.dueDate}
                    </p>
                  ) : null}
                  {action.sourceBlockerTitle ? (
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                      Learned from: {action.sourceBlockerTitle}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No preventive actions have been added yet.
              </p>
            )}
          </div>
        </Card>
      </section>

      <ExecutionImprovementPanel
        companySlug={companySlug}
        projectOptions={projectOptions}
        preventiveActionOptions={preventiveActionOptions}
        improvements={improvements}
      />
    </div>
  );
}
