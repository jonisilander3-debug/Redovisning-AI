import {
  ExecutionImprovementStatus,
  ExecutionImprovementTargetType,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const executionImprovementStatusLabels: Record<ExecutionImprovementStatus, string> = {
  PROPOSED: "Proposed",
  APPLIED: "Applied",
  ARCHIVED: "Archived",
};

export const executionImprovementTargetLabels: Record<ExecutionImprovementTargetType, string> = {
  TASK_GUIDANCE: "Task guidance",
  CHECKLIST_ITEM: "Checklist item",
};

export const createExecutionImprovementSchema = z.object({
  projectId: z.string().optional().transform((value) => value || ""),
  relatedTaskId: z.string().optional().transform((value) => value || ""),
  sourcePreventiveActionId: z.string().optional().transform((value) => value || ""),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(2).max(1000),
  targetType: z.nativeEnum(ExecutionImprovementTargetType),
  status: z.nativeEnum(ExecutionImprovementStatus),
  appliesToFutureTasks: z.boolean().default(true),
});

export const updateExecutionImprovementSchema = createExecutionImprovementSchema.extend({
  id: z.string().optional(),
});

export function getExecutionImprovementStatusLabel(status: ExecutionImprovementStatus) {
  return executionImprovementStatusLabels[status];
}

export function getExecutionImprovementStatusTone(status: ExecutionImprovementStatus) {
  if (status === "APPLIED") {
    return "success" as const;
  }

  if (status === "PROPOSED") {
    return "accent" as const;
  }

  return "default" as const;
}

export function getExecutionImprovementTargetLabel(targetType: ExecutionImprovementTargetType) {
  return executionImprovementTargetLabels[targetType];
}

export async function getAvailableExecutionImprovements({
  companyId,
  projectId,
}: {
  companyId: string;
  projectId: string;
}) {
  return prisma.executionImprovement.findMany({
    where: {
      companyId,
      status: {
        in: ["PROPOSED", "APPLIED"],
      },
      appliesToFutureTasks: true,
      OR: [{ projectId: null }, { projectId }],
    },
    include: {
      sourcePreventiveAction: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function ensureExecutionImprovementsAllowed({
  companyId,
  projectId,
  improvementIds,
}: {
  companyId: string;
  projectId: string;
  improvementIds: string[];
}) {
  if (improvementIds.length === 0) {
    return [];
  }

  const improvements = await prisma.executionImprovement.findMany({
    where: {
      companyId,
      id: { in: improvementIds },
      status: {
        in: ["PROPOSED", "APPLIED"],
      },
      OR: [{ projectId: null }, { projectId }],
    },
  });

  if (improvements.length !== improvementIds.length) {
    throw new Error("One or more selected prevention improvements are not available here.");
  }

  return improvements;
}
