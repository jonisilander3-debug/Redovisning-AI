import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getBlockerFollowUpStatusLabel,
  getBlockerFollowUpStatusTone,
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
  getBlockerStatusLabel,
  getBlockerStatusTone,
} from "@/lib/blockers";

type FollowUpOverviewPageProps = {
  companySlug: string;
  companyName: string;
  filters: {
    ownerId?: string;
    projectId?: string;
    followUpStatus?: string;
    severity?: string;
    overdueOnly?: boolean;
  };
  ownerOptions: Array<{ label: string; value: string }>;
  projectOptions: Array<{ label: string; value: string }>;
  blockers: Array<{
    id: string;
    title: string;
    description: string;
    status: "OPEN" | "RESOLVED";
    severity: "LOW" | "MEDIUM" | "HIGH";
    followUpAction: string | null;
    followUpDate: string | null;
    followUpStatus: "PENDING" | "IN_PROGRESS" | "DONE" | null;
    projectId: string;
    projectTitle: string;
    taskId: string;
    taskTitle: string;
    reporterName: string;
    followUpOwnerName: string | null;
    overdueFollowUp: boolean;
  }>;
};

export function FollowUpOverviewPage({
  companySlug,
  companyName,
  filters,
  ownerOptions,
  projectOptions,
  blockers,
}: FollowUpOverviewPageProps) {
  const summary = {
    open: blockers.filter((blocker) => blocker.status === "OPEN").length,
    overdue: blockers.filter((blocker) => blocker.overdueFollowUp).length,
    upcoming: blockers.filter(
      (blocker) =>
        blocker.followUpDate &&
        !blocker.overdueFollowUp &&
        blocker.status === "OPEN",
    ).length,
    missingPlan: blockers.filter(
      (blocker) =>
        blocker.status === "OPEN" &&
        (!blocker.followUpAction || !blocker.followUpOwnerName || !blocker.followUpDate),
    ).length,
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Follow-ups"
        title="Keep blocker recovery moving"
        description={`${companyName} can now see who owns each blocker, what should happen next, and what follow-up work may already be late.`}
      />

      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
        <SelectField
          label="Owner"
          name="ownerId"
          defaultValue={filters.ownerId ?? ""}
          options={[{ label: "Anyone", value: "" }, ...ownerOptions]}
        />
        <SelectField
          label="Project"
          name="projectId"
          defaultValue={filters.projectId ?? ""}
          options={[{ label: "All projects", value: "" }, ...projectOptions]}
        />
        <SelectField
          label="Follow-up status"
          name="followUpStatus"
          defaultValue={filters.followUpStatus ?? ""}
          options={[
            { label: "All statuses", value: "" },
            { label: "Pending", value: "PENDING" },
            { label: "In progress", value: "IN_PROGRESS" },
            { label: "Done", value: "DONE" },
          ]}
        />
        <SelectField
          label="Severity"
          name="severity"
          defaultValue={filters.severity ?? ""}
          options={[
            { label: "All severities", value: "" },
            { label: "Low", value: "LOW" },
            { label: "Medium", value: "MEDIUM" },
            { label: "High", value: "HIGH" },
          ]}
        />
        <SelectField
          label="Focus"
          name="overdueOnly"
          defaultValue={filters.overdueOnly ? "true" : ""}
          options={[
            { label: "All follow-ups", value: "" },
            { label: "Overdue only", value: "true" },
          ]}
        />
      </form>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Open blockers</p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">{summary.open}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Overdue follow-ups</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.overdue}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Upcoming follow-ups</p>
          <p className="text-2xl font-semibold text-[var(--color-accent)]">{summary.upcoming}</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Missing plan</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.missingPlan}</p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Follow-up overview
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            What needs action now
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
                        label={getBlockerStatusLabel(blocker.status)}
                        tone={getBlockerStatusTone(blocker.status)}
                      />
                      <StatusBadge
                        label={getBlockerFollowUpStatusLabel(blocker.followUpStatus)}
                        tone={getBlockerFollowUpStatusTone(blocker.followUpStatus)}
                      />
                      {blocker.overdueFollowUp ? (
                        <StatusBadge label="Overdue follow-up" tone="danger" />
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

                <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {blocker.description}
                </p>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Next step</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.followUpAction || "Not planned yet"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Owner</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.followUpOwnerName || "No owner yet"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Due</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.followUpDate || "No date set"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-surface)] p-4">
                    <p className="text-sm text-[var(--color-muted-foreground)]">Reported by</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                      {blocker.reporterName}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No blockers match the current follow-up filters.
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
