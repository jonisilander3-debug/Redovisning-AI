import {
  BlockerOutcomeStatus,
  BlockerFollowUpStatus,
  ExecutionImprovementStatus,
  PreventiveActionStatus,
  BlockerSeverity,
  TaskStatus,
  TaskTimelineEventType,
} from "@prisma/client";
import { detectRecurringBlockerPatterns } from "@/lib/recurrence-prevention";

export type ProjectRiskLevel = "healthy" | "attention" | "high";

export function getProjectRiskTone(level: ProjectRiskLevel) {
  if (level === "high") {
    return "danger" as const;
  }

  if (level === "attention") {
    return "accent" as const;
  }

  return "success" as const;
}

export function getProjectRiskLabel(level: ProjectRiskLevel) {
  if (level === "high") {
    return "High risk";
  }

  if (level === "attention") {
    return "Needs attention";
  }

  return "Healthy";
}

function daysBetween(start: Date, end = new Date()) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

export function getProjectRiskSummary(project: {
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: Date | null;
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    blockers: Array<{
      status: "OPEN" | "RESOLVED";
      severity: BlockerSeverity;
      followUpAction?: string | null;
      followUpDate?: Date | null;
      followUpStatus?: BlockerFollowUpStatus | null;
      outcomeStatus?: BlockerOutcomeStatus;
      title: string;
      createdAt: Date;
      reopenedAt?: Date | null;
      preventiveActions?: Array<{
        status: PreventiveActionStatus;
      }>;
      updatedAt: Date;
    }>;
    timelineEvents: Array<{
      type: TaskTimelineEventType;
      createdAt: Date;
    }>;
  }>;
  preventiveActions?: Array<{
    status: PreventiveActionStatus;
    dueDate: Date | null;
  }>;
  executionImprovements?: Array<{
    status: ExecutionImprovementStatus;
    appliesToFutureTasks: boolean;
  }>;
}) {
  const now = new Date();
  const overdueTasks = project.tasks.filter(
    (task) => task.dueDate && task.dueDate < now && task.status !== "DONE",
  );
  const openBlockers = project.tasks.flatMap((task) =>
    task.blockers.filter((blocker) => blocker.status === "OPEN"),
  );
  const highSeverityBlockers = openBlockers.filter(
    (blocker) => blocker.severity === "HIGH",
  ).length;
  const blockersWithoutFollowUp = openBlockers.filter(
    (blocker) => !blocker.followUpAction || !blocker.followUpDate || !blocker.followUpStatus,
  ).length;
  const overdueFollowUps = openBlockers.filter(
    (blocker) =>
      Boolean(
        blocker.followUpDate &&
          blocker.followUpDate < now &&
          blocker.followUpStatus !== "DONE",
      ),
  ).length;
  const reopenedBlockers = project.tasks.flatMap((task) =>
    task.blockers.filter((blocker) => blocker.outcomeStatus === "REOPENED"),
  ).length;
  const partialOutcomes = project.tasks.flatMap((task) =>
    task.blockers.filter((blocker) => blocker.outcomeStatus === "RESOLVED_PARTIAL"),
  ).length;
  const recurringPatterns = detectRecurringBlockerPatterns(
    project.tasks.flatMap((task) =>
      task.blockers.map((blocker, index) => ({
        id: `${task.id}-${index}-${blocker.title}`,
        title: blocker.title,
        status: blocker.status,
        severity: blocker.severity,
        createdAt: blocker.createdAt,
        reopenedAt: blocker.reopenedAt,
        outcomeStatus: blocker.outcomeStatus,
        projectId: task.id,
        projectTitle: task.title,
        taskId: task.id,
        taskTitle: task.title,
        preventiveActions: blocker.preventiveActions,
      })),
    ),
  );
  const recurringBlockers = recurringPatterns.reduce((sum, pattern) => sum + pattern.count, 0);
  const recurringWithoutPrevention = recurringPatterns.filter(
    (pattern) => pattern.missingPrevention,
  ).length;
  const overduePreventiveActions = (project.preventiveActions ?? []).filter(
    (action) => action.dueDate && action.dueDate < now && action.status !== "DONE",
  ).length;
  const completedPreventiveActions = (project.preventiveActions ?? []).filter(
    (action) => action.status === "DONE",
  ).length;
  const appliedExecutionImprovements = (project.executionImprovements ?? []).filter(
    (improvement) => improvement.status === "APPLIED" && improvement.appliesToFutureTasks,
  ).length;
  const recentReassignments = project.tasks.reduce(
    (sum, task) =>
      sum +
      task.timelineEvents.filter(
        (event) =>
          event.type === "ASSIGNEE_CHANGED" && daysBetween(event.createdAt, now) <= 14,
      ).length,
    0,
  );
  const recentHandoffs = project.tasks.reduce(
    (sum, task) =>
      sum +
      task.timelineEvents.filter(
        (event) =>
          event.type === "HANDOFF_ADDED" && daysBetween(event.createdAt, now) <= 14,
      ).length,
    0,
  );
  const staleTodoTasks = project.tasks.filter(
    (task) =>
      task.status === "TODO" &&
      !task.blockers.some((blocker) => blocker.status === "OPEN") &&
      daysBetween(task.createdAt, now) >= 7,
  ).length;
  const lateInProgressTasks = project.tasks.filter(
    (task) =>
      task.status === "IN_PROGRESS" &&
      Boolean(task.plannedEndDate && task.plannedEndDate < now),
  ).length;

  const score =
    overdueTasks.length * 2 +
    openBlockers.length * 3 +
    highSeverityBlockers * 2 +
    blockersWithoutFollowUp * 2 +
    overdueFollowUps * 2 +
    reopenedBlockers * 4 +
    partialOutcomes * 2 +
    recurringBlockers +
    recurringWithoutPrevention * 3 +
    overduePreventiveActions * 2 +
    Math.max(0, recentReassignments - 1) +
    Math.max(0, recentHandoffs - 2) +
    staleTodoTasks +
    lateInProgressTasks * 2 -
    Math.min(2, completedPreventiveActions) -
    Math.min(3, appliedExecutionImprovements);

  const level: ProjectRiskLevel =
    score >= 8 || highSeverityBlockers > 0
      ? "high"
      : score >= 3
        ? "attention"
        : "healthy";

  const signals = [
    overdueTasks.length > 0 ? `${overdueTasks.length} overdue tasks` : null,
    openBlockers.length > 0 ? `${openBlockers.length} open blockers` : null,
    blockersWithoutFollowUp > 0 ? `${blockersWithoutFollowUp} blockers without follow-up` : null,
    overdueFollowUps > 0 ? `${overdueFollowUps} overdue follow-ups` : null,
    reopenedBlockers > 0 ? `${reopenedBlockers} reopened blockers` : null,
    partialOutcomes > 0 ? `${partialOutcomes} partially resolved blockers` : null,
    recurringBlockers > 0 ? `${recurringBlockers} repeated blocker instances` : null,
    recurringWithoutPrevention > 0 ? `${recurringWithoutPrevention} repeated patterns without prevention` : null,
    overduePreventiveActions > 0 ? `${overduePreventiveActions} overdue preventive actions` : null,
    appliedExecutionImprovements > 0 ? `${appliedExecutionImprovements} active execution improvements` : null,
    recentReassignments > 2 ? `${recentReassignments} recent reassignments` : null,
    recentHandoffs > 3 ? `${recentHandoffs} recent handoffs` : null,
    staleTodoTasks > 0 ? `${staleTodoTasks} tasks waiting too long` : null,
    lateInProgressTasks > 0 ? `${lateInProgressTasks} tasks beyond plan` : null,
  ].filter(Boolean) as string[];

  return {
    level,
    score,
    overdueTasks: overdueTasks.length,
    openBlockers: openBlockers.length,
    highSeverityBlockers,
    blockersWithoutFollowUp,
    overdueFollowUps,
    reopenedBlockers,
    partialOutcomes,
    recurringBlockers,
    recurringWithoutPrevention,
    overduePreventiveActions,
    completedPreventiveActions,
    appliedExecutionImprovements,
    recentReassignments,
    recentHandoffs,
    staleTodoTasks,
    lateInProgressTasks,
    signals,
  };
}
