import { TimeEntryStatus } from "@prisma/client";
import { MyDayClient } from "@/components/employee/my-day-client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatDateLabel,
  formatDuration,
  formatTimeLabel,
  getTimeStatusLabel,
  getTimeStatusTone,
} from "@/lib/time-tracking";

type TimeItem = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date | null;
  status: TimeEntryStatus;
  note: string | null;
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

type EmployeeMyDayPageProps = {
  companySlug: string;
  companyName: string;
  userName: string;
  roleLabel: string;
  activeEntry: TimeItem | null;
  entries: TimeItem[];
  todayMinutes: number;
  todayLabel: string;
  assignedProjects: Array<{
    id: string;
    title: string;
    customerName: string;
    status: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      assignedUserId: string | null;
    }>;
  }>;
  todaysProjectTotals: Array<{
    projectId: string | null;
    projectName: string;
    taskId: string | null;
    taskName: string | null;
    minutes: number;
  }>;
};

function formatMinutesLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function EmployeeMyDayPage({
  companySlug,
  companyName,
  userName,
  roleLabel,
  activeEntry,
  entries,
  todayMinutes,
  todayLabel,
  assignedProjects,
  todaysProjectTotals,
}: EmployeeMyDayPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Day"
        title={`Good to see you, ${userName}`}
        description={`${companyName} is ready for the day. You are signed in as ${roleLabel.toLowerCase()}, and your work status stays simple and visible from one page.`}
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <MyDayClient
          companySlug={companySlug}
          isWorking={Boolean(activeEntry)}
          activeNote={activeEntry?.note ?? ""}
          activeProjectName={activeEntry?.project?.title}
          activeTaskName={activeEntry?.task?.title}
          todayDurationLabel={formatMinutesLabel(todayMinutes)}
          currentStatusLabel={activeEntry ? "Working" : "Not working"}
          activeSinceLabel={
            activeEntry ? formatTimeLabel(activeEntry.startTime) : undefined
          }
          assignedProjects={assignedProjects}
        />

        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Today at a glance
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              {todayLabel}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Current state
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">
                {activeEntry ? "Work is running" : "Ready to begin"}
              </p>
            </div>
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Active project
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                {activeEntry?.project?.title ||
                  todaysProjectTotals[0]?.projectName ||
                  "No project linked yet."}
              </p>
            </div>
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Active task
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
                {activeEntry?.task?.title ||
                  todaysProjectTotals[0]?.taskName ||
                  "General project work"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Today by project
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Where your time is going today
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {todaysProjectTotals.map((group) => (
            <Card key={`${group.projectId ?? "none"}-${group.taskId ?? "general"}`} className="space-y-2 bg-white">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {group.projectName}
              </p>
              <p className="text-sm text-[var(--color-foreground)]">
                {group.taskName || "General project work"}
              </p>
              <p className="text-xl font-semibold text-[var(--color-foreground)]">
                {formatMinutesLabel(group.minutes)}
              </p>
            </Card>
          ))}
          {todaysProjectTotals.length === 0 ? (
            <Card className="space-y-2">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">
                No project time yet today
              </p>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Start work on one of your assigned projects and it will show up here.
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Recent time history
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Your latest work sessions
          </h2>
        </div>

        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="space-y-4 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {entry.project?.title || "No project selected"}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {formatDateLabel(entry.date)} · {formatTimeLabel(entry.startTime)} to{" "}
                    {entry.endTime ? formatTimeLabel(entry.endTime) : "Now"}
                  </p>
                  <p className="text-sm text-[var(--color-foreground)]">
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
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                {entry.note || "No note added for this session."}
              </p>
            </Card>
          ))}

          {entries.length === 0 ? (
            <Card className="space-y-3">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">
                No time has been tracked yet
              </p>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Start your first work session and it will appear here right away.
              </p>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
