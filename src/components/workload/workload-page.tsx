import { UserRole, UserStatus } from "@prisma/client";
import { WorkloadFilters } from "@/components/workload/workload-filters";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatHours,
  getCapacityStatusLabel,
  getCapacityStatusTone,
} from "@/lib/workload";
import { getRoleLabel } from "@/lib/access";

type WorkloadPageProps = {
  companyName: string;
  summaries: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    defaultDailyCapacityHours: number;
    weeklyCapacityHours: number;
    assignedTasksCount: number;
    inProgressTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
    recentTrackedHours: number;
    planningLoadHours: number;
    capacityStatus: "available" | "balanced" | "overloaded";
    combinedLoadHours: number;
    topProjects: string[];
    taskWindowLabel: string;
  }>;
  projectOptions: Array<{ label: string; value: string }>;
  memberOptions: Array<{ label: string; value: string }>;
};

export function WorkloadPage({
  companyName,
  summaries,
  projectOptions,
  memberOptions,
}: WorkloadPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Workload"
        title="See who has room for the next task"
        description={`${companyName} can now compare assigned work, recent time, and available capacity in one lightweight planning view.`}
      />

      <WorkloadFilters
        projectOptions={projectOptions}
        memberOptions={memberOptions}
      />

      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card key={summary.id} className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                    {summary.name}
                  </h2>
                  <StatusBadge
                    label={getRoleLabel(summary.role)}
                    tone="primary"
                  />
                  <StatusBadge
                    label={getCapacityStatusLabel(summary.capacityStatus)}
                    tone={getCapacityStatusTone(summary.capacityStatus)}
                  />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {summary.email}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {summary.taskWindowLabel}
                </p>
              </div>

              <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Capacity this week
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                  {formatHours(summary.combinedLoadHours)} / {formatHours(summary.weeklyCapacityHours)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Assigned tasks</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.assignedTasksCount}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.inProgressTasks}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Overdue</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                  {summary.overdueTasks}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Upcoming</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {summary.upcomingTasks}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Recent tracked</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {formatHours(summary.recentTrackedHours)}
                </p>
              </div>
              <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-muted-foreground)]">Daily capacity</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                  {formatHours(summary.defaultDailyCapacityHours)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {summary.topProjects.length > 0 ? (
                summary.topProjects.map((project) => (
                  <StatusBadge key={project} label={project} tone="accent" />
                ))
              ) : (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  No assigned projects yet.
                </p>
              )}
            </div>
          </Card>
        ))}

        {summaries.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No people match the current workload filters.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
