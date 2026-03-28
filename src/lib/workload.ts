import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export type CapacityStatus = "available" | "balanced" | "overloaded";
export type CapacityTone = "default" | "primary" | "accent" | "success" | "danger";

type WorkloadTask = {
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
  };
  assignedUserId?: string | null;
};

export function getCapacityStatusTone(status: CapacityStatus): CapacityTone {
  if (status === "available") {
    return "success";
  }

  if (status === "overloaded") {
    return "danger";
  }

  return "default";
}

export function getCapacityStatusLabel(status: CapacityStatus) {
  if (status === "available") {
    return "Available";
  }

  if (status === "overloaded") {
    return "Overloaded";
  }

  return "Balanced";
}

export function formatHours(value: number) {
  if (value === 0) {
    return "0h";
  }

  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

export function getWeeklyCapacityHours({
  defaultDailyCapacityHours,
  weeklyCapacityHours,
}: {
  defaultDailyCapacityHours: number;
  weeklyCapacityHours: number | null;
}) {
  return weeklyCapacityHours ?? defaultDailyCapacityHours * 5;
}

export function getCapacityStatus({
  recentTrackedHours,
  planningLoadHours,
  weeklyCapacityHours,
}: {
  recentTrackedHours: number;
  planningLoadHours: number;
  weeklyCapacityHours: number;
}) {
  const combinedLoad = Math.max(recentTrackedHours, planningLoadHours);
  const ratio = weeklyCapacityHours === 0 ? 0 : combinedLoad / weeklyCapacityHours;

  if (ratio > 1.05) {
    return {
      status: "overloaded" as const,
      ratio,
      combinedLoad,
    };
  }

  if (ratio < 0.7) {
    return {
      status: "available" as const,
      ratio,
      combinedLoad,
    };
  }

  return {
    status: "balanced" as const,
    ratio,
    combinedLoad,
  };
}

export function getWeekWindow(todayInput = new Date()) {
  const today = new Date(todayInput);
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const recentStart = new Date(today);
  recentStart.setDate(recentStart.getDate() - 6);

  return { today, weekEnd, recentStart };
}

function isTaskScheduledThisWeek(task: WorkloadTask, today: Date, weekEnd: Date) {
  return Boolean(
    (task.plannedStartDate &&
      task.plannedStartDate >= today &&
      task.plannedStartDate <= weekEnd) ||
      (task.plannedEndDate &&
        task.plannedEndDate >= today &&
        task.plannedEndDate <= weekEnd) ||
      (task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd),
  );
}

function getPlanningLoadHoursForTask(task: WorkloadTask, today: Date, weekEnd: Date) {
  let hours = 0;

  if (task.status === "IN_PROGRESS") {
    hours += 6;
  } else if (task.status === "TODO") {
    hours += 2;
  }

  if (task.priority === "HIGH") {
    hours += 2;
  } else if (task.priority === "MEDIUM") {
    hours += 1;
  }

  if (task.dueDate && task.status !== "DONE") {
    if (task.dueDate < today) {
      hours += 3;
    } else if (task.dueDate <= weekEnd) {
      hours += 1.5;
    }
  }

  if (task.plannedStartDate && task.plannedStartDate >= today && task.plannedStartDate <= weekEnd) {
    hours += 1;
  }

  if (task.plannedEndDate && task.plannedEndDate >= today && task.plannedEndDate <= weekEnd) {
    hours += 1;
  }

  return hours;
}

function getTaskWindowLabel(task: WorkloadTask) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (task.plannedStartDate && task.plannedEndDate) {
    return `${formatter.format(task.plannedStartDate)} to ${formatter.format(task.plannedEndDate)}`;
  }

  if (task.plannedStartDate) {
    return `Starts ${formatter.format(task.plannedStartDate)}`;
  }

  if (task.plannedEndDate) {
    return `Ends ${formatter.format(task.plannedEndDate)}`;
  }

  if (task.dueDate) {
    return `Due ${formatter.format(task.dueDate)}`;
  }

  return "No planned window";
}

function getBaseTaskWhere({
  today,
  weekEnd,
  filters,
}: {
  today: Date;
  weekEnd: Date;
  filters?: {
    userId?: string;
    projectId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    dateScope?: "ALL" | "UPCOMING" | "OVERDUE" | "SCHEDULED";
  };
}): Prisma.TaskWhereInput {
  return {
    ...(filters?.projectId ? { projectId: filters.projectId } : {}),
    ...(filters?.userId ? { assignedUserId: filters.userId } : {}),
    ...(filters?.status && filters.status !== "ALL"
      ? { status: filters.status }
      : {}),
    ...(filters?.priority && filters.priority !== "ALL"
      ? { priority: filters.priority }
      : {}),
    ...(filters?.dateScope === "OVERDUE"
      ? {
          dueDate: {
            lt: today,
          },
          NOT: { status: TaskStatus.DONE },
        }
      : {}),
    ...(filters?.dateScope === "UPCOMING"
      ? {
          OR: [
            {
              dueDate: {
                gte: today,
                lte: weekEnd,
              },
            },
            {
              plannedStartDate: {
                gte: today,
                lte: weekEnd,
              },
            },
            {
              plannedEndDate: {
                gte: today,
                lte: weekEnd,
              },
            },
          ],
        }
      : {}),
    ...(filters?.dateScope === "SCHEDULED"
      ? {
          OR: [{ plannedStartDate: { not: null } }, { plannedEndDate: { not: null } }],
        }
      : {}),
  };
}

export async function getCompanyWorkloadSummary({
  viewer,
  filters,
}: {
  viewer: WorkspaceViewer;
  filters?: {
    userId?: string;
    projectId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    dateScope?: "ALL" | "UPCOMING" | "OVERDUE" | "SCHEDULED";
  };
}) {
  const { today, weekEnd, recentStart } = getWeekWindow();

  const members = await prisma.user.findMany({
    where: {
      companyId: viewer.company.id,
      status: {
        not: "INACTIVE",
      },
      ...(filters?.userId ? { id: filters.userId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      defaultDailyCapacityHours: true,
      weeklyCapacityHours: true,
      assignedTasks: {
        where: getBaseTaskWhere({ today, weekEnd, filters }),
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          plannedStartDate: true,
          plannedEndDate: true,
          assignedUserId: true,
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      timeEntries: {
        where: {
          startTime: {
            gte: recentStart,
          },
          ...(filters?.projectId ? { projectId: filters.projectId } : {}),
        },
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return members.map((member) => {
    const assignedTasksCount = member.assignedTasks.length;
    const inProgressTasks = member.assignedTasks.filter(
      (task) => task.status === "IN_PROGRESS",
    ).length;
    const overdueTasks = member.assignedTasks.filter(
      (task) => task.dueDate && task.dueDate < today && task.status !== "DONE",
    ).length;
    const upcomingTasks = member.assignedTasks.filter((task) =>
      isTaskScheduledThisWeek(task, today, weekEnd),
    ).length;

    const recentTrackedHours = member.timeEntries.reduce((sum, entry) => {
      const end = entry.endTime ?? new Date();
      const minutes = Math.max(
        0,
        Math.round((end.getTime() - entry.startTime.getTime()) / 60000),
      );
      return sum + minutes / 60;
    }, 0);

    const planningLoadHours = member.assignedTasks.reduce(
      (sum, task) => sum + getPlanningLoadHoursForTask(task, today, weekEnd),
      0,
    );

    const weeklyCapacityHours = getWeeklyCapacityHours({
      defaultDailyCapacityHours: member.defaultDailyCapacityHours,
      weeklyCapacityHours: member.weeklyCapacityHours,
    });

    const capacity = getCapacityStatus({
      recentTrackedHours,
      planningLoadHours,
      weeklyCapacityHours,
    });

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      defaultDailyCapacityHours: member.defaultDailyCapacityHours,
      weeklyCapacityHours,
      assignedTasksCount,
      inProgressTasks,
      overdueTasks,
      upcomingTasks,
      recentTrackedHours,
      planningLoadHours,
      capacityStatus: capacity.status,
      capacityRatio: capacity.ratio,
      combinedLoadHours: capacity.combinedLoad,
      topProjects: Array.from<string>(
        new Set(member.assignedTasks.map((task) => task.project.title)),
      ).slice(0, 3),
      taskWindowLabel:
        assignedTasksCount === 0
          ? "No assigned work"
          : overdueTasks > 0
            ? `${overdueTasks} overdue`
            : upcomingTasks > 0
              ? `${upcomingTasks} this week`
              : "Work is spread out",
    };
  });
}

export async function getWorkloadBadgeMap(viewer: WorkspaceViewer) {
  const summaries = await getCompanyWorkloadSummary({ viewer });

  return Object.fromEntries(
    summaries.map((summary) => [
      summary.id,
      {
        label: getCapacityStatusLabel(summary.capacityStatus),
        tone: getCapacityStatusTone(summary.capacityStatus),
      },
    ]),
  );
}

export async function getWeeklyPlanningData({
  viewer,
  filters,
}: {
  viewer: WorkspaceViewer;
  filters?: {
    userId?: string;
    projectId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    overloadedOnly?: boolean;
    availableOnly?: boolean;
  };
}) {
  const { today, weekEnd, recentStart } = getWeekWindow();

  const members = await prisma.user.findMany({
    where: {
      companyId: viewer.company.id,
      status: {
        not: "INACTIVE",
      },
      ...(filters?.userId ? { id: filters.userId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      defaultDailyCapacityHours: true,
      weeklyCapacityHours: true,
      assignedTasks: {
        where: {
          ...(filters?.projectId ? { projectId: filters.projectId } : {}),
          ...(filters?.status && filters.status !== "ALL"
            ? { status: filters.status }
            : {}),
          ...(filters?.priority && filters.priority !== "ALL"
            ? { priority: filters.priority }
            : {}),
          OR: [
            {
              dueDate: {
                gte: today,
                lte: weekEnd,
              },
            },
            {
              plannedStartDate: {
                gte: today,
                lte: weekEnd,
              },
            },
            {
              plannedEndDate: {
                gte: today,
                lte: weekEnd,
              },
            },
            {
              status: "IN_PROGRESS",
            },
            {
              dueDate: {
                lt: today,
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          plannedStartDate: true,
          plannedEndDate: true,
          assignedUserId: true,
          projectId: true,
          project: {
            select: {
              id: true,
              title: true,
              customerName: true,
              assignments: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          checklistItems: {
            select: {
              status: true,
            },
          },
          taskNotes: {
            orderBy: {
              createdAt: "desc",
            },
            take: 3,
            select: {
              id: true,
              type: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              timeEntries: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { plannedStartDate: "asc" }, { dueDate: "asc" }],
      },
      timeEntries: {
        where: {
          startTime: {
            gte: recentStart,
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const memberSummaries = members.map((member) => {
    const recentTrackedHours = member.timeEntries.reduce((sum, entry) => {
      const end = entry.endTime ?? new Date();
      const minutes = Math.max(
        0,
        Math.round((end.getTime() - entry.startTime.getTime()) / 60000),
      );
      return sum + minutes / 60;
    }, 0);

    const planningLoadHours = member.assignedTasks.reduce(
      (sum, task) => sum + getPlanningLoadHoursForTask(task, today, weekEnd),
      0,
    );

    const weeklyCapacityHours = getWeeklyCapacityHours({
      defaultDailyCapacityHours: member.defaultDailyCapacityHours,
      weeklyCapacityHours: member.weeklyCapacityHours,
    });

    const capacity = getCapacityStatus({
      recentTrackedHours,
      planningLoadHours,
      weeklyCapacityHours,
    });

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      defaultDailyCapacityHours: member.defaultDailyCapacityHours,
      weeklyCapacityHours,
      recentTrackedHours,
      planningLoadHours,
      combinedLoadHours: capacity.combinedLoad,
      capacityStatus: capacity.status,
      tasks: member.assignedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        plannedStartDate: task.plannedStartDate,
        plannedEndDate: task.plannedEndDate,
        projectId: task.projectId,
        projectName: task.project.title,
        customerName: task.project.customerName,
        checklistCompleted: task.checklistItems.filter((item) => item.status === "DONE")
          .length,
        checklistTotal: task.checklistItems.length,
        hasNotes: task.taskNotes.length > 0,
        hasHandoff: task.taskNotes.some((note) => note.type === "HANDOFF"),
        timeCount: task._count.timeEntries,
        taskWindowLabel: getTaskWindowLabel(task),
        overdue: Boolean(task.dueDate && task.dueDate < today && task.status !== "DONE"),
        eligibleAssignees: task.project.assignments.map((assignment) => ({
          id: assignment.user.id,
          name: assignment.user.name,
        })),
      })),
    };
  });

  const memberMap = Object.fromEntries(
    memberSummaries.map((member) => [member.id, member]),
  );

  const filteredMembers = memberSummaries.filter((member) => {
    if (filters?.overloadedOnly && member.capacityStatus !== "overloaded") {
      return false;
    }

    if (filters?.availableOnly && member.capacityStatus !== "available") {
      return false;
    }

    return true;
  });

  const suggestions: Array<{
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    fromMember: {
      id: string;
      name: string;
      capacityStatus: CapacityStatus;
    };
    toMember: {
      id: string;
      name: string;
      capacityStatus: CapacityStatus;
    };
    reason: string;
  }> = [];

  const availableMembers = memberSummaries.filter(
    (member) => member.capacityStatus === "available",
  );

  for (const member of memberSummaries) {
    if (member.capacityStatus !== "overloaded") {
      continue;
    }

    const movableTask = member.tasks.find(
      (task) => task.status === "TODO" && !task.overdue,
    );

    if (!movableTask) {
      continue;
    }

    const target = availableMembers.find(
      (candidate) =>
        candidate.id !== member.id &&
        movableTask.eligibleAssignees.some((assignee) => assignee.id === candidate.id),
    );

    if (!target) {
      continue;
    }

    suggestions.push({
      taskId: movableTask.id,
      taskTitle: movableTask.title,
      projectId: movableTask.projectId,
      projectName: movableTask.projectName,
      fromMember: {
        id: member.id,
        name: member.name,
        capacityStatus: member.capacityStatus,
      },
      toMember: {
        id: target.id,
        name: target.name,
        capacityStatus: target.capacityStatus,
      },
      reason: `${member.name} is overloaded while ${target.name} still has room this week.`,
    });
  }

  return {
    weekLabel: `${today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} to ${weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`,
    members: filteredMembers,
    suggestions: suggestions.slice(0, 8),
    memberMap,
  };
}
