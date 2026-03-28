import { TaskPriority, TaskStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getTaskPriorityLabel,
  getTaskPriorityTone,
  getTaskStatusLabel,
  getTaskStatusTone,
} from "@/lib/task-management";

type TaskCardProps = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName?: string | null;
  plannedWindowLabel?: string | null;
  dueDate?: string | null;
  overdue?: boolean;
  timeCount?: number;
  checklistTotal?: number;
  checklistCompleted?: number;
  checklistPercentage?: number;
};

export function TaskCard({
  title,
  description,
  status,
  priority,
  assigneeName,
  plannedWindowLabel,
  dueDate,
  overdue = false,
  timeCount,
  checklistTotal = 0,
  checklistCompleted = 0,
  checklistPercentage = 0,
}: TaskCardProps) {
  return (
    <Card className="space-y-4 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
            {title}
          </h3>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {description || "No extra detail added yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={getTaskStatusLabel(status)} tone={getTaskStatusTone(status)} />
          <StatusBadge
            label={getTaskPriorityLabel(priority)}
            tone={getTaskPriorityTone(priority)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            Assigned to
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground)]">
            {assigneeName || "Not assigned"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            Planned
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground)]">
            {plannedWindowLabel || "Not scheduled"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            Due
          </p>
          <p
            className={`mt-1 text-sm ${overdue ? "text-[var(--color-danger)]" : "text-[var(--color-foreground)]"}`}
          >
            {dueDate || "No due date"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            Logged sessions
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground)]">
            {timeCount ?? 0}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-[20px] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Checklist progress
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {checklistCompleted}/{checklistTotal || 0}
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${checklistPercentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
