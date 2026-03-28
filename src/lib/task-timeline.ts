import { TaskTimelineEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const taskTimelineEventLabels: Record<TaskTimelineEventType, string> = {
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  STATUS_CHANGED: "Status changed",
  PRIORITY_CHANGED: "Priority changed",
  ASSIGNEE_CHANGED: "Assignment changed",
  CHECKLIST_ITEM_ADDED: "Checklist step added",
  CHECKLIST_ITEM_COMPLETED: "Checklist step completed",
  CHECKLIST_ITEM_REOPENED: "Checklist step reopened",
  NOTE_ADDED: "Note added",
  HANDOFF_ADDED: "Handoff note added",
  TIME_STARTED: "Work started",
  TIME_STOPPED: "Work stopped",
  BLOCKER_REPORTED: "Blocker reported",
  BLOCKER_RESOLVED: "Blocker resolved",
  BLOCKER_REOPENED: "Blocker reopened",
  BLOCKER_OUTCOME_UPDATED: "Blocker outcome updated",
};

export function getTaskTimelineEventLabel(type: TaskTimelineEventType) {
  return taskTimelineEventLabels[type];
}

export function getTaskTimelineEventTone(type: TaskTimelineEventType) {
  if (
    type === "CHECKLIST_ITEM_COMPLETED" ||
    type === "TIME_STOPPED" ||
    type === "TASK_CREATED" ||
    type === "BLOCKER_RESOLVED"
  ) {
    return "success" as const;
  }

  if (
    type === "HANDOFF_ADDED" ||
    type === "STATUS_CHANGED" ||
    type === "TIME_STARTED"
  ) {
    return "accent" as const;
  }

  if (type === "ASSIGNEE_CHANGED" || type === "PRIORITY_CHANGED") {
    return "primary" as const;
  }

  if (type === "BLOCKER_REPORTED" || type === "BLOCKER_REOPENED") {
    return "danger" as const;
  }

  return "default" as const;
}

export function getTaskTimelineEventMarker(type: TaskTimelineEventType) {
  switch (type) {
    case "TASK_CREATED":
      return "Created";
    case "TASK_UPDATED":
      return "Updated";
    case "STATUS_CHANGED":
      return "Status";
    case "PRIORITY_CHANGED":
      return "Priority";
    case "ASSIGNEE_CHANGED":
      return "Assigned";
    case "CHECKLIST_ITEM_ADDED":
      return "Step";
    case "CHECKLIST_ITEM_COMPLETED":
      return "Done";
    case "CHECKLIST_ITEM_REOPENED":
      return "Reopened";
    case "NOTE_ADDED":
      return "Note";
    case "HANDOFF_ADDED":
      return "Handoff";
    case "TIME_STARTED":
      return "Start";
    case "TIME_STOPPED":
      return "Stop";
    case "BLOCKER_REPORTED":
      return "Blocked";
    case "BLOCKER_RESOLVED":
      return "Resolved";
    case "BLOCKER_REOPENED":
      return "Reopened";
    case "BLOCKER_OUTCOME_UPDATED":
      return "Outcome";
    default:
      return "Update";
  }
}

export async function createTaskTimelineEvent({
  companyId,
  projectId,
  taskId,
  userId,
  type,
  title,
  description,
  metadata,
}: {
  companyId: string;
  projectId: string;
  taskId: string;
  userId?: string | null;
  type: TaskTimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
}) {
  return prisma.taskTimelineEvent.create({
    data: {
      companyId,
      projectId,
      taskId,
      userId: userId || null,
      type,
      title,
      description: description || null,
      metadata: metadata || undefined,
    },
  });
}

export function getTaskTimelineSummary(
  events: Array<{
    type: TaskTimelineEventType;
    createdAt: Date;
  }>,
) {
  const latest = events[0] ?? null;

  return {
    hasTimeline: events.length > 0,
    latestType: latest?.type ?? null,
    latestAt: latest?.createdAt ?? null,
    hasRecentReassignment: events.some((event) => event.type === "ASSIGNEE_CHANGED"),
    hasRecentHandoff: events.some((event) => event.type === "HANDOFF_ADDED"),
  };
}
