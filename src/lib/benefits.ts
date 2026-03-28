import { BenefitStatus, BenefitType } from "@prisma/client";
import { z } from "zod";

export const benefitTypeLabels: Record<BenefitType, string> = {
  CAR: "Bilforman",
  MEAL: "Kostforman",
  HEALTH: "Halsoforman",
  OTHER: "Ovrig formon",
};

export const benefitStatusLabels: Record<BenefitStatus, string> = {
  DRAFT: "Utkast",
  APPROVED: "Godkand",
};

export function getBenefitStatusTone(status: BenefitStatus) {
  return status === "APPROVED" ? ("success" as const) : ("accent" as const);
}

export const createBenefitEntrySchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(BenefitType),
  description: z.string().trim().min(1).max(240),
  taxableAmount: z.coerce.number().positive(),
  date: z.string().min(1),
  status: z.nativeEnum(BenefitStatus).default("DRAFT"),
});

export const updateBenefitEntrySchema = z.object({
  status: z.nativeEnum(BenefitStatus).optional(),
});
