import { ChecklistItemStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { isEmployeeRole, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const taskStatusOptions = Object.entries(taskStatusLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const taskPriorityOptions = Object.entries(taskPriorityLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const baseTaskSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().transform((value) => value || ""),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  assignedUserId: z.string().optional().transform((value) => value || ""),
  plannedStartDate: z.string().optional().transform((value) => value || ""),
  plannedEndDate: z.string().optional().transform((value) => value || ""),
  dueDate: z.string().optional().transform((value) => value || ""),
  templateId: z.string().optional().transform((value) => value || ""),
  selectedImprovementIds: z.array(z.string()).default([]),
});

export const createTaskSchema = baseTaskSchema;
export const updateTaskSchema = baseTaskSchema;

export function getTaskStatusLabel(status: TaskStatus) {
  return taskStatusLabels[status];
}

export function getTaskStatusTone(status: TaskStatus) {
  if (status === "DONE") {
    return "success" as const;
  }
  if (status === "IN_PROGRESS") {
    return "accent" as const;
  }
  return "default" as const;
}

export function getTaskPriorityLabel(priority: TaskPriority) {
  return taskPriorityLabels[priority];
}

export function getTaskPriorityTone(priority: TaskPriority) {
  if (priority === "HIGH") {
    return "danger" as const;
  }
  if (priority === "MEDIUM") {
    return "accent" as const;
  }
  return "default" as const;
}

export function getTaskChecklistProgress(
  items: Array<{ status: ChecklistItemStatus }>,
) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "DONE").length;

  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function parseOptionalTaskDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export function isTaskOverdue(task: { dueDate: Date | null; status: TaskStatus }) {
  if (!task.dueDate || task.status === "DONE") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return task.dueDate.getTime() < today.getTime();
}

export function getPlanningWindowLabel({
  plannedStartDate,
  plannedEndDate,
}: {
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
}) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  if (!plannedStartDate && !plannedEndDate) {
    return "Not scheduled yet";
  }

  if (plannedStartDate && plannedEndDate) {
    return `${formatter.format(plannedStartDate)} to ${formatter.format(plannedEndDate)}`;
  }

  return plannedStartDate
    ? `Starts ${formatter.format(plannedStartDate)}`
    : `Ends ${formatter.format(plannedEndDate!)}`;
}

export async function ensureTaskAssigneeAllowed({
  companyId,
  projectId,
  assignedUserId,
}: {
  companyId: string;
  projectId: string;
  assignedUserId?: string;
}) {
  if (!assignedUserId) {
    return null;
  }

  const assignment = await prisma.projectAssignment.findFirst({
    where: {
      projectId,
      userId: assignedUserId,
      project: {
        companyId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw new Error("Choose someone already assigned to this project.");
  }

  return assignment;
}

export async function getVisibleTasksForViewer(viewer: WorkspaceViewer) {
  return prisma.task.findMany({
    where: {
      companyId: viewer.company.id,
      ...(isEmployeeRole(viewer.role)
        ? {
            OR: [
              { assignedUserId: viewer.id },
              {
                project: {
                  assignments: {
                    some: {
                      userId: viewer.id,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
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
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      checklistItems: {
        where: isEmployeeRole(viewer.role)
          ? {
              OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
            }
          : undefined,
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      taskNotes: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      timelineEvents: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      blockers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          followUpOwner: {
            select: {
              id: true,
              name: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
      _count: {
        select: {
          timeEntries: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { plannedStartDate: "asc" },
      { dueDate: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export async function getTasksForProject(projectId: string, viewer: WorkspaceViewer) {
  return prisma.task.findMany({
    where: {
      projectId,
      companyId: viewer.company.id,
      ...(isEmployeeRole(viewer.role)
        ? {
            OR: [
              { assignedUserId: viewer.id },
              {
                project: {
                  assignments: {
                    some: {
                      userId: viewer.id,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      checklistItems: {
        where: isEmployeeRole(viewer.role)
          ? {
              OR: [{ assignedUserId: viewer.id }, { assignedUserId: null }],
            }
          : undefined,
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      taskNotes: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      timelineEvents: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      blockers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          followUpOwner: {
            select: {
              id: true,
              name: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
      _count: {
        select: {
          timeEntries: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getPlanningTasksForViewer({
  viewer,
  filters,
}: {
  viewer: WorkspaceViewer;
  filters?: {
    projectId?: string;
    assignedUserId?: string;
    status?: TaskStatus | "ALL";
    priority?: TaskPriority | "ALL";
    dateScope?: "ALL" | "UPCOMING" | "OVERDUE" | "SCHEDULED";
  };
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return prisma.task.findMany({
    where: {
      companyId: viewer.company.id,
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.assignedUserId
        ? {
            assignedUserId: filters.assignedUserId,
          }
        : {}),
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
            NOT: {
              status: "DONE",
            },
          }
        : {}),
      ...(filters?.dateScope === "UPCOMING"
        ? {
            OR: [
              {
                dueDate: {
                  gte: today,
                  lte: nextWeek,
                },
              },
              {
                plannedStartDate: {
                  gte: today,
                  lte: nextWeek,
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
    },
    include: {
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
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      checklistItems: {
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
          content: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      timelineEvents: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      blockers: {
        where: {
          OR: [{ status: "OPEN" }, { userId: viewer.id }],
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          severity: true,
          followUpAction: true,
          followUpDate: true,
          followUpStatus: true,
          lastFollowUpAt: true,
          outcomeStatus: true,
          outcomeSummary: true,
          verifiedAt: true,
          reopenedAt: true,
          reopenReason: true,
          createdAt: true,
          resolvedAt: true,
          followUpOwner: {
            select: {
              id: true,
              name: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      timeEntries: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
      _count: {
        select: {
          timeEntries: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { plannedStartDate: "asc" },
      { dueDate: "asc" },
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
  });
}
