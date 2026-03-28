import { JobTypePresetStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const jobTypePresetStatusLabels: Record<JobTypePresetStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export const createJobTypePresetSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().transform((value) => value || ""),
  launchLabel: z.string().trim().max(80).optional().transform((value) => value || ""),
  launchDescription: z.string().trim().max(240).optional().transform((value) => value || ""),
  status: z.nativeEnum(JobTypePresetStatus),
  linkedProjectTemplateId: z.string().optional().transform((value) => value || ""),
});

export const updateJobTypePresetSchema = createJobTypePresetSchema.extend({
  id: z.string().optional(),
});

export function getJobTypePresetStatusLabel(status: JobTypePresetStatus) {
  return jobTypePresetStatusLabels[status];
}

export function getJobTypePresetStatusTone(status: JobTypePresetStatus) {
  return status === "ACTIVE" ? ("success" as const) : ("default" as const);
}

export async function getActiveJobTypePresets(companyId: string) {
  return prisma.jobTypePreset.findMany({
    where: {
      companyId,
      status: "ACTIVE",
    },
    include: {
      linkedProjectTemplate: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}
