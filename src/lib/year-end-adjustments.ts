import { Prisma, YearEndAdjustmentStatus, YearEndAdjustmentType } from "@prisma/client";
import { z } from "zod";
import { createManualJournalEntryInDb } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

function decimal(value: number | string | Prisma.Decimal) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value);
}

export const yearEndAdjustmentTypeLabels: Record<YearEndAdjustmentType, string> = {
  PREPAID_EXPENSE: "Forutbetald kostnad",
  ACCRUED_EXPENSE: "Upplupen kostnad",
  APPROPRIATION: "Bokslutsdisposition",
  TAX: "Skattejustering",
  MANUAL: "Manuell bokslutspost",
};

export const yearEndAdjustmentStatusLabels: Record<YearEndAdjustmentStatus, string> = {
  DRAFT: "Utkast",
  POSTED: "Bokford",
};

export function getYearEndAdjustmentStatusTone(status: YearEndAdjustmentStatus) {
  return status === "POSTED" ? ("success" as const) : ("accent" as const);
}

export const createYearEndAdjustmentSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  type: z.nativeEnum(YearEndAdjustmentType),
  date: z.string().min(1),
  description: z.string().trim().min(2).max(240),
  amount: z.coerce.number().positive(),
  debitAccountId: z.string().min(1),
  creditAccountId: z.string().min(1),
  note: z.string().trim().max(500).optional().transform((value) => value || ""),
  status: z.nativeEnum(YearEndAdjustmentStatus).default("POSTED"),
});

export async function createYearEndAdjustment({
  companyId,
  year,
  type,
  date,
  description,
  amount,
  debitAccountId,
  creditAccountId,
  note,
  status,
}: {
  companyId: string;
  year: number;
  type: YearEndAdjustmentType;
  date: Date;
  description: string;
  amount: number;
  debitAccountId: string;
  creditAccountId: string;
  note?: string | null;
  status?: YearEndAdjustmentStatus;
}) {
  if (debitAccountId === creditAccountId) {
    throw new Error("Debet- och kreditkonto maste vara olika.");
  }

  return prisma.$transaction(async (tx) => {
    const adjustment = await tx.yearEndAdjustment.create({
      data: {
        companyId,
        year,
        type,
        status: status ?? "POSTED",
        date,
        description,
        amount,
        debitAccountId,
        creditAccountId,
        note: note || null,
      },
    });

    if ((status ?? "POSTED") === "POSTED") {
      const journalEntry = await createManualJournalEntryInDb(
        {
          companyId,
          date,
          description,
          sourceId: `year-end-adjustment:${adjustment.id}`,
          status: "POSTED",
          lines: [
            {
              accountId: debitAccountId,
              debit: decimal(amount),
              credit: ZERO,
              description,
            },
            {
              accountId: creditAccountId,
              debit: ZERO,
              credit: decimal(amount),
              description,
            },
          ],
        },
        tx,
      );

      return tx.yearEndAdjustment.update({
        where: {
          id: adjustment.id,
        },
        data: {
          journalEntryId: journalEntry.id,
        },
        include: {
          debitAccount: true,
          creditAccount: true,
          journalEntry: true,
        },
      });
    }

    return adjustment;
  });
}
