import { TaskTimelineEventType } from "@prisma/client";

type TimelineTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  checklistItems: Array<{
    status: "TODO" | "DONE";
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
};

type ProjectTimeEntry = {
  status: string;
  startTime: Date;
  endTime: Date | null;
};

function isWithinLastDays(value: Date, days: number) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return value >= threshold;
}

export function getProjectDeliveryTimeline(tasks: TimelineTask[]) {
  return tasks
    .flatMap((task) =>
      task.timelineEvents.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        createdAt: event.createdAt,
        taskId: task.id,
        taskTitle: task.title,
        user: event.user,
      })),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getProjectDeliverySummary(
  tasks: TimelineTask[],
  timeEntries: ProjectTimeEntry[],
) {
  const deliveryTimeline = getProjectDeliveryTimeline(tasks);
  const overdueTasks = tasks.filter(
    (task) => task.status !== "DONE" && task.dueDate && task.dueDate < new Date(),
  ).length;
  const completedRecently = deliveryTimeline.filter(
    (event) =>
      event.type === "STATUS_CHANGED" &&
      event.title.toLowerCase().includes("done") &&
      isWithinLastDays(event.createdAt, 7),
  ).length;
  const recentReassignments = deliveryTimeline.filter(
    (event) => event.type === "ASSIGNEE_CHANGED" && isWithinLastDays(event.createdAt, 7),
  ).length;
  const recentHandoffs = deliveryTimeline.filter(
    (event) => event.type === "HANDOFF_ADDED" && isWithinLastDays(event.createdAt, 7),
  ).length;
  const recentActiveWork = timeEntries.filter(
    (entry) => entry.status === "ACTIVE" || isWithinLastDays(entry.startTime, 2),
  ).length;
  const checklistTotal = tasks.reduce((sum, task) => sum + task.checklistItems.length, 0);
  const checklistCompleted = tasks.reduce(
    (sum, task) =>
      sum + task.checklistItems.filter((item) => item.status === "DONE").length,
    0,
  );

  return {
    completedRecently,
    overdueTasks,
    recentReassignments,
    recentHandoffs,
    recentActiveWork,
    checklistTotal,
    checklistCompleted,
    checklistPercentage:
      checklistTotal === 0 ? 0 : Math.round((checklistCompleted / checklistTotal) * 100),
  };
}
