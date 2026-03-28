"use client";

import {
  TaskNoteType,
  TaskPriority,
  TaskStatus,
  TaskTimelineEventType,
} from "@prisma/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { TaskReassignControl } from "@/components/planning/task-reassign-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getPlanningWindowLabel,
  getTaskChecklistProgress,
  getTaskPriorityLabel,
  getTaskPriorityTone,
  getTaskStatusLabel,
  isTaskOverdue,
  taskPriorityOptions,
  taskStatusOptions,
} from "@/lib/task-management";
import { getTaskNoteSummary, getTaskNoteTone, getTaskNoteTypeLabel } from "@/lib/task-notes";
import {
  getTaskTimelineEventLabel,
  getTaskTimelineEventTone,
  getTaskTimelineSummary,
} from "@/lib/task-timeline";
import { formatDateLabel, formatDuration } from "@/lib/time-tracking";

type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  project: {
    id: string;
    title: string;
    customerName: string;
  };
  assignedUser: {
    id: string;
    name: string;
  } | null;
  checklistItems: Array<{
    status: "TODO" | "DONE";
  }>;
  taskNotes: Array<{
    id: string;
    type: TaskNoteType;
    createdAt: string;
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
    createdAt: string;
    user: {
      id: string;
      name: string;
    } | null;
  }>;
  eligibleAssignees: Array<{
    id: string;
    name: string;
  }>;
  timeEntries: Array<{
    startTime: string;
    endTime: string | null;
  }>;
  _count: {
    timeEntries: number;
  };
};

type TaskBoardClientProps = {
  companySlug: string;
  tasks: BoardTask[];
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

const columns: Array<{ status: TaskStatus; title: string; description: string }> = [
  {
    status: "TODO",
    title: "To do",
    description: "Work that is ready to be planned or started.",
  },
  {
    status: "IN_PROGRESS",
    title: "In progress",
    description: "Active work that is currently moving.",
  },
  {
    status: "DONE",
    title: "Done",
    description: "Finished work that is no longer blocking delivery.",
  },
];

function getTimeSummary(entries: BoardTask["timeEntries"]) {
  const totalMinutes = entries.reduce((sum, entry) => {
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    const start = new Date(entry.startTime);
    return sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }, 0);

  if (totalMinutes === 0) {
    return "No time yet";
  }

  return formatDuration(new Date(0), new Date(totalMinutes * 60000));
}

export function TaskBoardClient({
  companySlug,
  tasks,
  projectOptions,
  teamOptions,
  assigneeWorkload,
}: TaskBoardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL") {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  function moveTask(task: BoardTask, status: TaskStatus) {
    if (task.status === status) {
      return;
    }

    setError(null);
    setPendingTaskId(task.id);

    startTransition(async () => {
      const response = await fetch(
        `/api/workspace/${companySlug}/projects/${task.project.id}/tasks/${task.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not move that task.");
        setPendingTaskId(null);
        return;
      }

      setPendingTaskId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SelectField
            label="Project"
            name="projectId"
            value={searchParams.get("projectId") ?? ""}
            onChange={(event) => updateFilter("projectId", event.target.value)}
            options={projectOptions}
          />
          <SelectField
            label="Assigned to"
            name="assignedUserId"
            value={searchParams.get("assignedUserId") ?? ""}
            onChange={(event) => updateFilter("assignedUserId", event.target.value)}
            options={teamOptions}
          />
          <SelectField
            label="Status"
            name="status"
            value={searchParams.get("status") ?? "ALL"}
            onChange={(event) => updateFilter("status", event.target.value)}
            options={[{ label: "All statuses", value: "ALL" }, ...taskStatusOptions]}
          />
          <SelectField
            label="Priority"
            name="priority"
            value={searchParams.get("priority") ?? "ALL"}
            onChange={(event) => updateFilter("priority", event.target.value)}
            options={[{ label: "All priorities", value: "ALL" }, ...taskPriorityOptions]}
          />
          <SelectField
            label="Date focus"
            name="dateScope"
            value={searchParams.get("dateScope") ?? "ALL"}
            onChange={(event) => updateFilter("dateScope", event.target.value)}
            options={[
              { label: "All timing", value: "ALL" },
              { label: "Upcoming", value: "UPCOMING" },
              { label: "Overdue", value: "OVERDUE" },
              { label: "Scheduled", value: "SCHEDULED" },
            ]}
          />
        </div>

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);

          return (
            <Card key={column.status} className="space-y-4 bg-[var(--color-surface)] p-4 sm:p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-foreground)]">
                      {column.title}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {column.description}
                    </p>
                  </div>
                  <StatusBadge label={`${columnTasks.length}`} tone="primary" />
                </div>
              </div>

              <div className="space-y-3">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => {
                    const progress = getTaskChecklistProgress(task.checklistItems);
                    const noteSummary = getTaskNoteSummary(
                      task.taskNotes.map((note) => ({
                        type: note.type,
                        createdAt: new Date(note.createdAt),
                      })),
                    );
                    const timelineSummary = getTaskTimelineSummary(
                      task.timelineEvents.map((event) => ({
                        type: event.type,
                        createdAt: new Date(event.createdAt),
                      })),
                    );
                    const overdue = isTaskOverdue({
                      dueDate: task.dueDate ? new Date(task.dueDate) : null,
                      status: task.status,
                    });

                    return (
                      <div
                        key={task.id}
                        className="space-y-4 rounded-[22px] border border-[var(--color-border)] bg-white p-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[var(--color-foreground)]">
                              {task.title}
                            </p>
                            <StatusBadge
                              label={getTaskPriorityLabel(task.priority)}
                              tone={getTaskPriorityTone(task.priority)}
                            />
                            {overdue ? <StatusBadge label="Overdue" tone="danger" /> : null}
                            {noteSummary.hasHandoff ? (
                              <StatusBadge label="Handoff note" tone="accent" />
                            ) : null}
                            {noteSummary.latestType ? (
                              <StatusBadge
                                label={`Recent ${getTaskNoteTypeLabel(noteSummary.latestType).toLowerCase()}`}
                                tone={getTaskNoteTone(noteSummary.latestType)}
                              />
                            ) : null}
                            {timelineSummary.latestType ? (
                              <StatusBadge
                                label={getTaskTimelineEventLabel(timelineSummary.latestType)}
                                tone={getTaskTimelineEventTone(timelineSummary.latestType)}
                              />
                            ) : null}
                          </div>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {task.project.customerName} | {task.project.title}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                              Assigned
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="text-sm text-[var(--color-foreground)]">
                                {task.assignedUser?.name || "Unassigned"}
                              </p>
                              {task.assignedUser &&
                              assigneeWorkload[task.assignedUser.id] ? (
                                <StatusBadge
                                  label={assigneeWorkload[task.assignedUser.id].label}
                                  tone={assigneeWorkload[task.assignedUser.id].tone}
                                />
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                              Due
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-foreground)]">
                              {task.dueDate ? formatDateLabel(new Date(task.dueDate)) : "No due date"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                              Planned window
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-foreground)]">
                              {getPlanningWindowLabel({
                                plannedStartDate: task.plannedStartDate
                                  ? new Date(task.plannedStartDate)
                                  : null,
                                plannedEndDate: task.plannedEndDate
                                  ? new Date(task.plannedEndDate)
                                  : null,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                              Time summary
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-foreground)]">
                              {task._count.timeEntries} sessions | {getTimeSummary(task.timeEntries)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-[18px] bg-[var(--color-surface)] p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[var(--color-foreground)]">
                              Checklist
                            </p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                              {progress.completed}/{progress.total}
                            </p>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-[var(--color-accent)]"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {columns
                            .filter((targetColumn) => targetColumn.status !== task.status)
                            .map((targetColumn) => (
                              <Button
                                key={targetColumn.status}
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={() => moveTask(task, targetColumn.status)}
                                disabled={isPending && pendingTaskId === task.id}
                              >
                                {isPending && pendingTaskId === task.id
                                  ? "Moving..."
                                  : `Move to ${getTaskStatusLabel(targetColumn.status).toLowerCase()}`}
                              </Button>
                            ))}
                        </div>

                        <TaskReassignControl
                          companySlug={companySlug}
                          projectId={task.project.id}
                          taskId={task.id}
                          currentAssigneeId={task.assignedUser?.id}
                          currentAssigneeName={task.assignedUser?.name}
                          eligibleAssignees={task.eligibleAssignees}
                          workloadMap={assigneeWorkload}
                          compact
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] bg-white px-4 py-6 text-sm leading-6 text-[var(--color-muted-foreground)]">
                    No tasks in this column with the current filters.
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
