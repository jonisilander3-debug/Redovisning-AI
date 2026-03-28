import { WorkTemplateStatus, WorkTemplateType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const workTemplateTypeLabels: Record<WorkTemplateType, string> = {
  PROJECT_TEMPLATE: "Project template",
  TASK_TEMPLATE: "Task template",
};

export const workTemplateStatusLabels: Record<WorkTemplateStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export const createTemplateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().transform((value) => value || ""),
  templateType: z.nativeEnum(WorkTemplateType),
  status: z.nativeEnum(WorkTemplateStatus),
  sourceProjectId: z.string().optional().transform((value) => value || ""),
  sourceTaskId: z.string().optional().transform((value) => value || ""),
  defaultProjectTitle: z.string().trim().max(120).optional().transform((value) => value || ""),
  defaultProjectDescription: z.string().trim().max(600).optional().transform((value) => value || ""),
  defaultTaskTitle: z.string().trim().max(120).optional().transform((value) => value || ""),
  defaultTaskDescription: z.string().trim().max(600).optional().transform((value) => value || ""),
});

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().optional(),
});

export function getWorkTemplateTypeLabel(type: WorkTemplateType) {
  return workTemplateTypeLabels[type];
}

export function getWorkTemplateStatusLabel(status: WorkTemplateStatus) {
  return workTemplateStatusLabels[status];
}

export function getWorkTemplateStatusTone(status: WorkTemplateStatus) {
  return status === "ACTIVE" ? ("success" as const) : ("default" as const);
}

export async function getActiveTemplates({
  companyId,
  templateType,
}: {
  companyId: string;
  templateType: WorkTemplateType;
}) {
  return prisma.workTemplate.findMany({
    where: {
      companyId,
      templateType,
      status: "ACTIVE",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getWorkTemplateById({
  companyId,
  templateId,
}: {
  companyId: string;
  templateId: string;
}) {
  return prisma.workTemplate.findFirst({
    where: {
      id: templateId,
      companyId,
    },
    include: {
      tasks: {
        include: {
          checklistItems: {
            orderBy: [{ sortOrder: "asc" }],
          },
        },
        orderBy: [{ sortOrder: "asc" }],
      },
      checklistItems: {
        where: {
          templateTaskId: null,
        },
        orderBy: [{ sortOrder: "asc" }],
      },
      linkedImprovements: {
        include: {
          executionImprovement: true,
        },
      },
    },
  });
}
