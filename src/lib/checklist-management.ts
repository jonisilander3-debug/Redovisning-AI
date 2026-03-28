import { ChecklistItemStatus } from "@prisma/client";
import { z } from "zod";
import { canManageProjects, isEmployeeRole, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const checklistStatusLabels: Record<ChecklistItemStatus, string> = {
  TODO: "To do",
  DONE: "Done",
};

export const checklistStatusOptions = Object.entries(checklistStatusLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

const baseChecklistItemSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || ""),
  status: z.nativeEnum(ChecklistItemStatus).default(ChecklistItemStatus.TODO),
  sortOrder: z.coerce.number().int().min(0).max(500).default(0),
  assignedUserId: z.string().optional().transform((value) => value || ""),
});

export const createChecklistItemSchema = baseChecklistItemSchema;
export const updateChecklistItemSchema = baseChecklistItemSchema;

export function getChecklistStatusLabel(status: ChecklistItemStatus) {
  return checklistStatusLabels[status];
}

export function getChecklistStatusTone(status: ChecklistItemStatus) {
  return status === "DONE" ? ("success" as const) : ("default" as const);
}

export function getChecklistProgress(
  items: Array<{ status: ChecklistItemStatus }>,
) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "DONE").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percentage,
  };
}

export async function ensureChecklistAssigneeAllowed({
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

export async function getChecklistItemForViewer({
  companyId,
  projectId,
  taskId,
  itemId,
  viewer,
}: {
  companyId: string;
  projectId: string;
  taskId: string;
  itemId: string;
  viewer: WorkspaceViewer;
}) {
  return prisma.checklistItem.findFirst({
    where: {
      id: itemId,
      companyId,
      projectId,
      taskId,
      ...(isEmployeeRole(viewer.role)
        ? {
            project: {
              assignments: {
                some: {
                  userId: viewer.id,
                },
              },
            },
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
      task: {
        select: {
          id: true,
          title: true,
          assignedUserId: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export async function getChecklistItemsForTask({
  companyId,
  projectId,
  taskId,
  viewer,
}: {
  companyId: string;
  projectId: string;
  taskId: string;
  viewer: WorkspaceViewer;
}) {
  return prisma.checklistItem.findMany({
    where: {
      companyId,
      projectId,
      taskId,
      ...(isEmployeeRole(viewer.role)
        ? {
            project: {
              assignments: {
                some: {
                  userId: viewer.id,
                },
              },
            },
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
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function ensureChecklistWriteAccess({
  companyId,
  projectId,
  taskId,
  viewer,
}: {
  companyId: string;
  projectId: string;
  taskId: string;
  viewer: WorkspaceViewer;
}) {
  if (canManageProjects(viewer.role)) {
    return prisma.task.findFirst({
      where: {
        id: taskId,
        companyId,
        projectId,
      },
      select: {
        id: true,
        assignedUserId: true,
      },
    });
  }

  return prisma.task.findFirst({
    where: {
      id: taskId,
      companyId,
      projectId,
      project: {
        assignments: {
          some: {
            userId: viewer.id,
          },
        },
      },
    },
    select: {
      id: true,
      assignedUserId: true,
    },
  });
}
