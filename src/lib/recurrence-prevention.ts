import {
  BlockerOutcomeStatus,
  BlockerSeverity,
  BlockerStatus,
  PreventiveActionStatus,
  UserRole,
} from "@prisma/client";
import { z } from "zod";
import { canManageProjects, type WorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const preventiveActionStatusLabels: Record<PreventiveActionStatus, string> = {
  PROPOSED: "Proposed",
  ACTIVE: "Active",
  DONE: "Done",
};

export const createPreventiveActionSchema = z.object({
  projectId: z.string().optional().transform((value) => value || ""),
  relatedTaskId: z.string().optional().transform((value) => value || ""),
  sourceBlockerId: z.string().optional().transform((value) => value || ""),
  ownerId: z.string().optional().transform((value) => value || ""),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(2).max(1000),
  status: z.nativeEnum(PreventiveActionStatus),
  dueDate: z.string().optional().transform((value) => value || ""),
});

export const updatePreventiveActionSchema = createPreventiveActionSchema.extend({
  id: z.string().optional(),
});

export function getPreventiveActionStatusLabel(status: PreventiveActionStatus) {
  return preventiveActionStatusLabels[status];
}

export function getPreventiveActionStatusTone(status: PreventiveActionStatus) {
  if (status === "DONE") {
    return "success" as const;
  }

  if (status === "ACTIVE") {
    return "primary" as const;
  }

  return "accent" as const;
}

export function parseOptionalPreventionDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export function normalizeBlockerPattern(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleRoot(value: string) {
  return normalizeBlockerPattern(value)
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

export function isRecurringBlockerCandidate(blocker: {
  title: string;
  reopenedAt?: Date | null;
  outcomeStatus?: BlockerOutcomeStatus;
}) {
  return Boolean(blocker.reopenedAt || blocker.outcomeStatus === "REOPENED");
}

export function detectRecurringBlockerPatterns(
  blockers: Array<{
    id: string;
    title: string;
    status: BlockerStatus;
    severity: BlockerSeverity;
    createdAt: Date;
    reopenedAt?: Date | null;
    outcomeStatus?: BlockerOutcomeStatus;
    projectId: string;
    projectTitle: string;
    taskId: string;
    taskTitle: string;
    preventiveActions?: Array<{
      id?: string;
      status: PreventiveActionStatus;
    }>;
  }>,
) {
  const groups = new Map<
    string,
    {
      key: string;
      normalizedTitle: string;
      projectId: string;
      projectTitle: string;
      blockers: typeof blockers;
    }
  >();

  for (const blocker of blockers) {
    const normalizedTitle = getTitleRoot(blocker.title);
    const key = `${blocker.projectId}:${normalizedTitle}`;
    const current = groups.get(key);

    if (current) {
      current.blockers.push(blocker);
      continue;
    }

    groups.set(key, {
      key,
      normalizedTitle,
      projectId: blocker.projectId,
      projectTitle: blocker.projectTitle,
      blockers: [blocker],
    });
  }

  return Array.from(groups.values())
    .map((group) => {
      const reopenedCount = group.blockers.filter((blocker) =>
        isRecurringBlockerCandidate(blocker),
      ).length;
      const highSeverityCount = group.blockers.filter(
        (blocker) => blocker.severity === "HIGH",
      ).length;
      const activePreventiveActions = group.blockers.flatMap((blocker) =>
        (blocker.preventiveActions ?? []).filter((action) => action.status !== "DONE"),
      ).length;
      const donePreventiveActions = group.blockers.flatMap((blocker) =>
        (blocker.preventiveActions ?? []).filter((action) => action.status === "DONE"),
      ).length;
      const recurring =
        group.blockers.length >= 2 || reopenedCount >= 1;

      return {
        key: group.key,
        normalizedTitle: group.normalizedTitle,
        projectId: group.projectId,
        projectTitle: group.projectTitle,
        blockers: [...group.blockers].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
        count: group.blockers.length,
        reopenedCount,
        highSeverityCount,
        activePreventiveActions,
        donePreventiveActions,
        recurring,
        missingPrevention:
          recurring && activePreventiveActions === 0 && donePreventiveActions === 0,
      };
    })
    .filter((group) => group.recurring)
    .sort((a, b) => {
      const riskA =
        a.reopenedCount * 3 +
        a.highSeverityCount * 2 +
        a.count +
        (a.missingPrevention ? 2 : 0);
      const riskB =
        b.reopenedCount * 3 +
        b.highSeverityCount * 2 +
        b.count +
        (b.missingPrevention ? 2 : 0);

      return riskB - riskA;
    });
}

export async function ensurePreventiveActionOwnerAllowed({
  companyId,
  ownerId,
}: {
  companyId: string;
  ownerId?: string;
}) {
  if (!ownerId) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: ownerId,
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

export async function getPreventiveActionForViewer({
  viewer,
  actionId,
}: {
  viewer: WorkspaceViewer;
  actionId: string;
}) {
  return prisma.preventiveAction.findFirst({
    where: {
      id: actionId,
      companyId: viewer.company.id,
      ...(canManageProjects(viewer.role)
        ? {}
        : {
            OR: [
              {
                project: {
                  assignments: {
                    some: {
                      userId: viewer.id,
                    },
                  },
                },
              },
              {
                relatedTask: {
                  assignedUserId: viewer.id,
                },
              },
            ],
          }),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      sourceBlocker: {
        select: {
          id: true,
          title: true,
          projectId: true,
          taskId: true,
        },
      },
    },
  });
}

export function canManagePreventiveActions(role: UserRole) {
  return canManageProjects(role);
}
