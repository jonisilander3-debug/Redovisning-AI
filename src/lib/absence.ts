import { AbsenceStatus, AbsenceType } from "@prisma/client";
import { z } from "zod";

export const absenceTypeLabels: Record<AbsenceType, string> = {
  SICK: "Sjuk",
  VACATION: "Semester",
  VAB: "VAB",
  UNPAID_LEAVE: "Tjanstledig utan lon",
  OTHER: "Ovrigt",
};

export const absenceStatusLabels: Record<AbsenceStatus, string> = {
  DRAFT: "Utkast",
  APPROVED: "Godkand",
};

export function getAbsenceStatusTone(status: AbsenceStatus) {
  return status === "APPROVED" ? ("success" as const) : ("accent" as const);
}

export const createAbsenceEntrySchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(AbsenceType),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  quantityDays: z.coerce.number().min(0).optional(),
  quantityHours: z.coerce.number().min(0).optional(),
  note: z.string().trim().max(500).optional().transform((value) => value || ""),
  status: z.nativeEnum(AbsenceStatus).default("DRAFT"),
});

export const updateAbsenceEntrySchema = z.object({
  status: z.nativeEnum(AbsenceStatus).optional(),
  note: z.string().trim().max(500).optional().transform((value) => value || ""),
});

export function parseAbsenceDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
