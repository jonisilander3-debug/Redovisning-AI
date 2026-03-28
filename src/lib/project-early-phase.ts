import { BlockerStatus, ProjectKickoffStatus, TaskStatus } from "@prisma/client";

export type EarlyPhaseHealth = "healthy" | "attention" | "off_track";

function daysSince(value: Date, now = new Date()) {
  return Math.floor((now.getTime() - value.getTime()) / 86400000);
}

export function getEarlyPhaseHealthTone(level: EarlyPhaseHealth) {
  if (level === "off_track") {
    return "danger" as const;
  }

  if (level === "attention") {
    return "accent" as const;
  }

  return "success" as const;
}

export function getEarlyPhaseHealthLabel(level: EarlyPhaseHealth) {
  if (level === "off_track") {
    return "Off track";
  }

  if (level === "attention") {
    return "Attention needed";
  }

  return "On track";
}

export function getProjectEarlyPhaseSummary(project: {
  kickoffStatus: ProjectKickoffStatus;
  kickoffCompletedAt: Date | null;
  kickoffFocusTasks: Array<{
    sortOrder: number;
    task: {
      id: string;
      title: string;
    };
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: Date | null;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    updatedAt: Date;
    blockers: Array<{
      status: BlockerStatus;
      severity: "LOW" | "MEDIUM" | "HIGH";
      followUpStatus?: "PENDING" | "IN_PROGRESS" | "DONE" | null;
    }>;
    checklistItems: Array<{
      status: "TODO" | "DONE";
    }>;
    assignedUser?: {
      id: string;
      name: string;
    } | null;
  }>;
}) {
  const now = new Date();
  const daysFromKickoff = project.kickoffCompletedAt ? daysSince(project.kickoffCompletedAt, now) : null;
  const focusTaskIds = project.kickoffFocusTasks.map((item) => item.task.id);
  const focusTasks = focusTaskIds
    .map((taskId) => project.tasks.find((task) => task.id === taskId))
    .filter(Boolean) as typeof project.tasks;
  const fallbackFocusTasks =
    focusTasks.length > 0
      ? focusTasks
      : project.tasks.filter((task) => task.status !== "DONE").slice(0, 3);
  const trackedTasks = fallbackFocusTasks;
  const completed = trackedTasks.filter((task) => task.status === "DONE").length;
  const inProgress = trackedTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const todo = trackedTasks.filter((task) => task.status === "TODO").length;
  const overdue = trackedTasks.filter(
    (task) => task.dueDate && task.dueDate < now && task.status !== "DONE",
  ).length;
  const blocked = trackedTasks.filter((task) =>
    task.blockers.some((blocker) => blocker.status === "OPEN"),
  ).length;
  const blockerFollowUpsIncomplete = trackedTasks.filter((task) =>
    task.blockers.some(
      (blocker) =>
        blocker.status === "OPEN" &&
        blocker.followUpStatus !== "DONE",
    ),
  ).length;
  const checklistTotal = trackedTasks.reduce(
    (sum, task) => sum + task.checklistItems.length,
    0,
  );
  const checklistCompleted = trackedTasks.reduce(
    (sum, task) => sum + task.checklistItems.filter((item) => item.status === "DONE").length,
    0,
  );
  const checklistPercentage =
    checklistTotal === 0 ? 0 : Math.round((checklistCompleted / checklistTotal) * 100);
  const noProgress =
    trackedTasks.length > 0 &&
    completed === 0 &&
    inProgress === 0 &&
    checklistCompleted === 0;

  let level: EarlyPhaseHealth = "healthy";

  if (
    blocked >= 2 ||
    overdue >= 2 ||
    (daysFromKickoff !== null && daysFromKickoff >= 3 && noProgress)
  ) {
    level = "off_track";
  } else if (
    blocked > 0 ||
    overdue > 0 ||
    blockerFollowUpsIncomplete > 0 ||
    (daysFromKickoff !== null && daysFromKickoff >= 2 && completed === 0 && inProgress === 0)
  ) {
    level = "attention";
  }

  if (project.kickoffStatus !== "COMPLETED") {
    level = "attention";
  }

  const signals = [
    trackedTasks.length > 0 ? `${trackedTasks.length} kickoff tasks in first phase` : null,
    completed > 0 ? `${completed} first tasks completed` : null,
    inProgress > 0 ? `${inProgress} first tasks in progress` : null,
    overdue > 0 ? `${overdue} first tasks overdue` : null,
    blocked > 0 ? `${blocked} kickoff tasks blocked` : null,
    blockerFollowUpsIncomplete > 0
      ? `${blockerFollowUpsIncomplete} kickoff blockers still need follow-up`
      : null,
    daysFromKickoff !== null ? `Day ${daysFromKickoff + 1} after kickoff` : null,
  ].filter(Boolean) as string[];

  const needsAttention = [
    overdue > 0 ? "Some first-step work is already overdue." : null,
    blocked > 0 ? "A kickoff task is blocked and may slow the start." : null,
    noProgress && daysFromKickoff !== null && daysFromKickoff >= 2
      ? "The first phase has not shown enough visible progress yet."
      : null,
  ].filter(Boolean) as string[];

  const isInEarlyPhase =
    project.kickoffStatus === "COMPLETED" &&
    daysFromKickoff !== null &&
    (daysFromKickoff <= 7 || completed < trackedTasks.length);

  return {
    isInEarlyPhase,
    level,
    daysFromKickoff,
    trackedTasks,
    total: trackedTasks.length,
    completed,
    inProgress,
    todo,
    overdue,
    blocked,
    blockerFollowUpsIncomplete,
    checklistCompleted,
    checklistTotal,
    checklistPercentage,
    noProgress,
    signals,
    needsAttention,
  };
}
