import { Prisma, VatReportStatus } from "@prisma/client";
import { z } from "zod";
import { ensureAccountingPeriodLock } from "@/lib/accounting-periods";
import { createManualJournalEntryInDb, seedDefaultAccounts } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export const vatReportStatusLabels: Record<VatReportStatus, string> = {
  DRAFT: "Utkast",
  READY: "Klar att lamna",
  FILED: "Lamnad",
};

export function getVatReportStatusTone(status: VatReportStatus) {
  if (status === "FILED") {
    return "success" as const;
  }

  if (status === "READY") {
    return "accent" as const;
  }

  return "default" as const;
}

export const createVatReportSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  correctionOfVatReportRunId: z.string().trim().optional().transform((value) => value || ""),
});

export const updateVatReportStatusSchema = z.object({
  status: z.nativeEnum(VatReportStatus),
});

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function createVatReportRun(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  correctionOfVatReportRunId?: string | null,
) {
  const normalizedStart = startOfDay(periodStart);
  const normalizedEnd = endOfDay(periodEnd);

  const existing = await prisma.vatReportRun.findFirst({
    where: {
      companyId,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      correctionOfVatReportRunId: null,
    },
    select: {
      id: true,
    },
  });

  if (existing && !correctionOfVatReportRunId) {
    throw new Error("Det finns redan en momsrapport for den valda perioden.");
  }

  if (correctionOfVatReportRunId) {
    const original = await prisma.vatReportRun.findFirst({
      where: {
        id: correctionOfVatReportRunId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!original) {
      throw new Error("Den momsrapport du vill korrigera kunde inte hittas.");
    }
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId,
      status: "POSTED",
      NOT: {
        sourceId: {
          startsWith: "vat-settlement:",
        },
      },
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
      lines: {
        some: {
          account: {
            number: {
              in: ["2611", "2641"],
            },
          },
        },
      },
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              id: true,
              number: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const outputVat25 = entries.reduce((sum, entry) => {
    const lineTotal = entry.lines
      .filter((line) => line.account.number === "2611")
      .reduce((lineSum, line) => lineSum.add(line.credit).sub(line.debit), ZERO);
    return sum.add(lineTotal);
  }, ZERO);

  const inputVat = entries.reduce((sum, entry) => {
    const lineTotal = entry.lines
      .filter((line) => line.account.number === "2641")
      .reduce((lineSum, line) => lineSum.add(line.debit).sub(line.credit), ZERO);
    return sum.add(lineTotal);
  }, ZERO);

  const netVatPayable = outputVat25.sub(inputVat);

  return prisma.vatReportRun.create({
    data: {
      companyId,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      outputVat25: roundMoney(outputVat25),
      inputVat: roundMoney(inputVat),
      netVatPayable: roundMoney(netVatPayable),
      journalEntryCount: entries.length,
      correctionOfVatReportRunId: correctionOfVatReportRunId || null,
      journalEntries: {
        create: entries.map((entry) => ({
          journalEntryId: entry.id,
        })),
      },
    },
    include: {
      journalEntries: {
        include: {
          journalEntry: {
            select: {
              id: true,
              date: true,
              description: true,
              sourceType: true,
            },
          },
        },
      },
    },
  });
}

export async function createVatSettlementJournalEntry(vatReportRunId: string) {
  return prisma.$transaction(async (tx) =>
    createVatSettlementJournalEntryInDb(vatReportRunId, tx),
  );
}

export async function createVatSettlementJournalEntryInDb(
  vatReportRunId: string,
  db: Prisma.TransactionClient,
) {
  const report = await db.vatReportRun.findUnique({
    where: {
      id: vatReportRunId,
    },
    select: {
      id: true,
      companyId: true,
      periodStart: true,
      periodEnd: true,
      outputVat25: true,
      inputVat: true,
      netVatPayable: true,
      settlementJournalEntryId: true,
    },
  });

  if (!report) {
    throw new Error("Momsrapporten kunde inte hittas.");
  }

  if (report.settlementJournalEntryId) {
    return db.journalEntry.findUnique({
      where: {
        id: report.settlementJournalEntryId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  await seedDefaultAccounts(report.companyId, db);
  const accounts = await db.account.findMany({
    where: {
      companyId: report.companyId,
      number: {
        in: ["2611", "2641", "2650"],
      },
    },
  });
  const accountMap = new Map(accounts.map((account) => [account.number, account]));

  const outputAccountId = accountMap.get("2611")?.id;
  const inputAccountId = accountMap.get("2641")?.id;
  const settlementAccountId = accountMap.get("2650")?.id;

  if (!outputAccountId || !inputAccountId || !settlementAccountId) {
    throw new Error("Standardkonton for momsavstamning saknas.");
  }

  const zero = new Prisma.Decimal(0);
  const lines: Array<{
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    description: string;
  }> = [];

  if (!report.outputVat25.equals(zero)) {
    lines.push({
      accountId: outputAccountId,
      debit: report.outputVat25,
      credit: zero,
      description: "Nollning av utgaende moms",
    });
  }

  if (!report.inputVat.equals(zero)) {
    lines.push({
      accountId: inputAccountId,
      debit: zero,
      credit: report.inputVat,
      description: "Nollning av ingaende moms",
    });
  }

  if (report.netVatPayable.greaterThan(zero)) {
    lines.push({
      accountId: settlementAccountId,
      debit: zero,
      credit: report.netVatPayable,
      description: "Moms att betala",
    });
  } else if (report.netVatPayable.lessThan(zero)) {
    lines.push({
      accountId: settlementAccountId,
      debit: report.netVatPayable.abs(),
      credit: zero,
      description: "Moms att fa tillbaka",
    });
  }

  if (lines.length === 0) {
    throw new Error("Momsrapporten saknar belopp att omboka.");
  }

  const journalEntry = await createManualJournalEntryInDb(
    {
      companyId: report.companyId,
      date: report.periodEnd,
      description: `Momsombokning ${report.periodStart.toISOString().slice(0, 10)}-${report.periodEnd.toISOString().slice(0, 10)}`,
      sourceId: `vat-settlement:${report.id}`,
      lines,
    },
    db,
  );

  await db.vatReportRun.update({
    where: {
      id: report.id,
    },
    data: {
      settlementJournalEntryId: journalEntry.id,
      settledAt: new Date(),
    },
  });

  await ensureAccountingPeriodLock(
    report.companyId,
    "VAT",
    report.periodStart,
    report.periodEnd,
    `Momperiod stangd via rapport ${report.id}`,
    db,
  );

  return journalEntry;
}
