import {
  TaskNoteType,
  TaskPriority,
  TaskStatus,
  TaskTimelineEventType,
} from "@prisma/client";
import { TaskBoardClient } from "@/components/planning/task-board-client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type TaskBoardPageProps = {
  companySlug: string;
  companyName: string;
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    project: {
      id: string;
      title: string;
      customerName: string;
      assignments: Array<{
        user: {
          id: string;
          name: string;
        };
      }>;
    };
    assignedUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    checklistItems: Array<{
      status: "TODO" | "DONE";
    }>;
    taskNotes: Array<{
      id: string;
      type: TaskNoteType;
      createdAt: Date;
      content: string;
      user: {
        id: string;
        name: string;
      };
    }>;
    timelineEvents: Array<{
      id: string;
      type: TaskTimelineEventType;
      title: string;
      description: string | null;
      createdAt: Date;
      user: {
        id: string;
        name: string;
      } | null;
    }>;
    timeEntries: Array<{
      startTime: Date;
      endTime: Date | null;
    }>;
    _count: {
      timeEntries: number;
    };
  }>;
  projectOptions: Array<{ label: string; value: string }>;
  teamOptions: Array<{ label: string; value: string }>;
  assigneeWorkload: Record<
    string,
    {
      label: string;
      tone: "default" | "primary" | "accent" | "success" | "danger";
    }
  >;
};

function getSummary(tasks: TaskBoardPageProps["tasks"]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tasks.filter(
    (task) =>
      task.dueDate &&
      task.status !== "DONE" &&
      task.dueDate.getTime() < today.getTime(),
  ).length;

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 7);

  const upcoming = tasks.filter((task) => {
    return (
      (task.dueDate &&
        task.dueDate >= today &&
        task.dueDate <= limit &&
        task.status !== "DONE") ||
      (task.plannedStartDate &&
        task.plannedStartDate >= today &&
        task.plannedStartDate <= limit)
    );
  }).length;

  const scheduled = tasks.filter(
    (task) => task.plannedStartDate || task.plannedEndDate,
  ).length;

  return {
    overdue,
    upcoming,
    scheduled,
  };
}

export function TaskBoardPage({
  companySlug,
  companyName,
  tasks,
  projectOptions,
  teamOptions,
  assigneeWorkload,
}: TaskBoardPageProps) {
  const summary = getSummary(tasks);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Planning"
        title="Plan work clearly across the company"
        description={`${companyName} can now see tasks on a simple board, move work between stages, and add lightweight scheduling without making the workspace feel heavy.`}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Scheduled work
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {summary.scheduled}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Tasks already have a planned start or end date.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Upcoming soon
          </p>
          <p className="text-2xl font-semibold text-[var(--color-foreground)]">
            {summary.upcoming}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Tasks that should be on someone&apos;s radar this week.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Overdue
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {summary.overdue}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Tasks past their due date and still not done.
          </p>
        </Card>
      </section>

      <TaskBoardClient
        companySlug={companySlug}
        tasks={tasks.map((task) => ({
          ...task,
          dueDate: task.dueDate?.toISOString() ?? null,
          plannedStartDate: task.plannedStartDate?.toISOString() ?? null,
          plannedEndDate: task.plannedEndDate?.toISOString() ?? null,
          eligibleAssignees: task.project.assignments.map((assignment) => ({
            id: assignment.user.id,
            name: assignment.user.name,
          })),
          taskNotes: task.taskNotes.map((note) => ({
            ...note,
            createdAt: note.createdAt.toISOString(),
          })),
          timelineEvents: task.timelineEvents.map((event) => ({
            ...event,
            createdAt: event.createdAt.toISOString(),
          })),
          timeEntries: task.timeEntries.map((entry) => ({
            startTime: entry.startTime.toISOString(),
            endTime: entry.endTime?.toISOString() ?? null,
          })),
        }))}
        projectOptions={projectOptions}
        teamOptions={teamOptions}
        assigneeWorkload={assigneeWorkload}
      />
    </div>
  );
}
