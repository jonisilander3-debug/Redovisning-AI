import {
  BlockerOutcomeStatus,
  BlockerFollowUpStatus,
  BlockerSeverity,
  BlockerStatus,
  type UserRole,
} from "@prisma/client";
import { z } from "zod";
import { canManageProjects, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const blockerSeverityLabels: Record<BlockerSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const blockerStatusLabels: Record<BlockerStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
};

export const blockerFollowUpStatusLabels: Record<BlockerFollowUpStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const blockerOutcomeStatusLabels: Record<BlockerOutcomeStatus, string> = {
  UNVERIFIED: "Unverified",
  RESOLVED_CONFIRMED: "Resolved confirmed",
  RESOLVED_PARTIAL: "Partially resolved",
  REOPENED: "Reopened",
};

export const createBlockerSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1000),
  severity: z.nativeEnum(BlockerSeverity),
});

export const resolveBlockerSchema = z.object({
  status: z.literal(BlockerStatus.RESOLVED),
  resolutionNote: z.string().trim().max(500).optional().transform((value) => value || ""),
});

export const updateBlockerFollowUpSchema = z.object({
  followUpAction: z.string().trim().max(240).optional().transform((value) => value || ""),
  followUpOwnerId: z.string().optional().transform((value) => value || ""),
  followUpDate: z.string().optional().transform((value) => value || ""),
  followUpStatus: z
    .nativeEnum(BlockerFollowUpStatus)
    .optional()
    .nullable(),
});

export const updateBlockerOutcomeSchema = z.object({
  outcomeStatus: z.nativeEnum(BlockerOutcomeStatus),
  outcomeSummary: z.string().trim().max(600).optional().transform((value) => value || ""),
  reopenReason: z.string().trim().max(600).optional().transform((value) => value || ""),
});

export function getBlockerSeverityLabel(severity: BlockerSeverity) {
  return blockerSeverityLabels[severity];
}

export function getBlockerSeverityTone(severity: BlockerSeverity) {
  if (severity === "HIGH") {
    return "danger" as const;
  }

  if (severity === "MEDIUM") {
    return "accent" as const;
  }

  return "success" as const;
}

export function getBlockerStatusLabel(status: BlockerStatus) {
  return blockerStatusLabels[status];
}

export function getBlockerStatusTone(status: BlockerStatus) {
  return status === "OPEN" ? ("danger" as const) : ("success" as const);
}

export function getBlockerFollowUpStatusLabel(status: BlockerFollowUpStatus | null) {
  return status ? blockerFollowUpStatusLabels[status] : "Not planned";
}

export function getBlockerFollowUpStatusTone(status: BlockerFollowUpStatus | null) {
  if (!status) {
    return "default" as const;
  }

  if (status === "DONE") {
    return "success" as const;
  }

  if (status === "IN_PROGRESS") {
    return "accent" as const;
  }

  return "primary" as const;
}

export function getBlockerOutcomeStatusLabel(status: BlockerOutcomeStatus) {
  return blockerOutcomeStatusLabels[status];
}

export function getBlockerOutcomeStatusTone(status: BlockerOutcomeStatus) {
  if (status === "RESOLVED_CONFIRMED") {
    return "success" as const;
  }

  if (status === "RESOLVED_PARTIAL" || status === "UNVERIFIED") {
    return "accent" as const;
  }

  return "danger" as const;
}

export function parseOptionalFollowUpDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export async function ensureFollowUpOwnerAllowed({
  companyId,
  followUpOwnerId,
}: {
  companyId: string;
  followUpOwnerId?: string;
}) {
  if (!followUpOwnerId) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: followUpOwnerId,
      companyId,
      status: {
        not: "INACTIVE",
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!user) {
    throw new Error("Choose someone active in this company.");
  }

  return user;
}

export async function ensureBlockerTaskAccess({
  viewer,
  companyId,
  projectId,
  taskId,
}: {
  viewer: WorkspaceViewer;
  companyId: string;
  projectId: string;
  taskId: string;
}) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      companyId,
      projectId,
      ...(canManageProjects(viewer.role)
        ? {}
        : {
            project: {
              assignments: {
                some: {
                  userId: viewer.id,
                },
              },
            },
          }),
    },
    select: {
      id: true,
      title: true,
      projectId: true,
    },
  });
}

export async function getBlockerForViewer({
  viewer,
  companyId,
  projectId,
  taskId,
  blockerId,
}: {
  viewer: WorkspaceViewer;
  companyId: string;
  projectId: string;
  taskId: string;
  blockerId: string;
}) {
  return prisma.taskBlocker.findFirst({
    where: {
      id: blockerId,
      companyId,
      projectId,
      taskId,
      ...(canManageProjects(viewer.role)
        ? {}
        : {
            project: {
              assignments: {
                some: {
                  userId: viewer.id,
                },
              },
            },
          }),
    },
    include: {
      user: {
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
        },
      },
      followUpOwner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export function canResolveBlockers(role: UserRole) {
  return canManageProjects(role);
}
