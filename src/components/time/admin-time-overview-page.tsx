import { TimeEntryStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatDateLabel,
  formatDuration,
  formatTimeLabel,
  getTimeStatusLabel,
  getTimeStatusTone,
} from "@/lib/time-tracking";

type AdminTimeEntryItem = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date | null;
  status: TimeEntryStatus;
  note: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  project: {
    id: string;
    title: string;
    customerName: string;
  } | null;
  task: {
    id: string;
    title: string;
  } | null;
};

type AdminTimeOverviewPageProps = {
  companyName: string;
  companySlug: string;
  entries: AdminTimeEntryItem[];
  members: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; title: string }>;
  tasks: Array<{ id: string; title: string }>;
  filters: {
    userId?: string;
    projectId?: string;
    taskId?: string;
    status?: string;
    date?: string;
  };
};

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Working", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
];

export function AdminTimeOverviewPage({
  companyName,
  companySlug,
  entries,
  members,
  projects,
  tasks,
  filters,
}: AdminTimeOverviewPageProps) {
  const taskTotals = entries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.task?.title ?? entry.project?.title ?? "General project work";
    const minutes = Math.max(
      0,
      Math.round(((entry.endTime ?? new Date()).getTime() - entry.startTime.getTime()) / 60000),
    );
    acc[key] = (acc[key] ?? 0) + minutes;
    return acc;
  }, {});

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Time"
        title="See work sessions across the company"
        description={`${companyName} can now review time entries in one clear overview, while employees only see their own work sessions.`}
      />

      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Filter the overview
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Narrow the list when needed
          </h2>
        </div>

        <form
          action={`/workspace/${companySlug}/time`}
          className="grid gap-4 md:grid-cols-4"
        >
          <SelectField
            label="Team member"
            name="userId"
            defaultValue={filters.userId ?? ""}
            options={[
              { label: "Everyone", value: "" },
              ...members.map((member) => ({
                label: member.name,
                value: member.id,
              })),
            ]}
          />
          <SelectField
            label="Project"
            name="projectId"
            defaultValue={filters.projectId ?? ""}
            options={[
              { label: "All projects", value: "" },
              ...projects.map((project) => ({
                label: project.title,
                value: project.id,
              })),
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={filters.status ?? ""}
            options={statusOptions}
          />
          <SelectField
            label="Task"
            name="taskId"
            defaultValue={filters.taskId ?? ""}
            options={[
              { label: "All tasks", value: "" },
              ...tasks.map((task) => ({
                label: task.title,
                value: task.id,
              })),
            ]}
          />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[var(--color-foreground)]">
              Date
            </span>
            <input
              type="date"
              name="date"
              defaultValue={filters.date ?? ""}
              className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none transition-shadow focus:ring-4 focus:ring-[color:rgba(37,99,235,0.14)]"
            />
          </label>
          <div className="md:col-span-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.8)] transition-colors hover:bg-[#1d4ed8]"
            >
              Apply filters
            </button>
            <a
              href={`/workspace/${companySlug}/time`}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              Clear filters
            </a>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(taskTotals)
          .slice(0, 4)
          .map(([label, minutes]) => (
            <Card key={label} className="space-y-2 bg-white">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {label}
              </p>
              <p className="text-xl font-semibold text-[var(--color-foreground)]">
                {Math.floor(minutes / 60)}h {(minutes % 60).toString().padStart(2, "0")}m
              </p>
            </Card>
          ))}
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <Card key={entry.id} className="space-y-4 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-[var(--color-foreground)]">
                  {entry.user.name}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {entry.user.email}
                </p>
                <p className="text-sm text-[var(--color-foreground)]">
                  {entry.project?.title || "No project selected"}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {entry.task?.title || "General project work"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={getTimeStatusLabel(entry.status)}
                  tone={getTimeStatusTone(entry.status)}
                />
                <StatusBadge
                  label={formatDuration(entry.startTime, entry.endTime)}
                  tone="primary"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Date
                </p>
                <p className="mt-1 text-sm text-[var(--color-foreground)]">
                  {formatDateLabel(entry.date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  Start
                </p>
                <p className="mt-1 text-sm text-[var(--color-foreground)]">
                  {formatTimeLabel(entry.startTime)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                  End
                </p>
                <p className="mt-1 text-sm text-[var(--color-foreground)]">
                  {entry.endTime ? formatTimeLabel(entry.endTime) : "Still working"}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              {entry.note || "No note added for this session."}
            </p>
          </Card>
        ))}

        {entries.length === 0 ? (
          <Card className="space-y-3">
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              No time entries match these filters
            </p>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              Try a broader view to see more of the company&apos;s work sessions.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
