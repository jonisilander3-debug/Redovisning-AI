import { Ink2RunStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { getBalanceSheet, getProfitAndLoss } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

function sumRowsByPrefix(
  rows: Array<{ number: string; debit: Prisma.Decimal; credit: Prisma.Decimal; balance: Prisma.Decimal }>,
  prefixes: string[],
  mode: "credit-minus-debit" | "debit-minus-credit" | "balance",
) {
  return rows
    .filter((row) => prefixes.some((prefix) => row.number.startsWith(prefix)))
    .reduce((sum, row) => {
      if (mode === "credit-minus-debit") {
        return sum.add(row.credit.sub(row.debit));
      }
      if (mode === "debit-minus-credit") {
        return sum.add(row.debit.sub(row.credit));
      }
      return sum.add(row.balance);
    }, ZERO);
}

export const ink2RunStatusLabels: Record<Ink2RunStatus, string> = {
  DRAFT: "Utkast",
  READY: "Klar",
  EXPORTED: "Exporterad",
};

export function getInk2RunStatusTone(status: Ink2RunStatus) {
  if (status === "EXPORTED") {
    return "success" as const;
  }
  if (status === "READY") {
    return "accent" as const;
  }
  return "default" as const;
}

export const createInk2RunSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function buildInk2LineDraft(companyId: string) {
  const [profitAndLoss, balanceSheet] = await Promise.all([
    getProfitAndLoss(companyId),
    getBalanceSheet(companyId),
  ]);

  const allRows = [...profitAndLoss.rows, ...balanceSheet.assets, ...balanceSheet.liabilities, ...balanceSheet.equity];

  return [
    {
      code: "1.1",
      label: "Nettoomsattning",
      amount: sumRowsByPrefix(allRows, ["30"], "credit-minus-debit"),
      sortOrder: 10,
    },
    {
      code: "3.1",
      label: "Material och varukostnader",
      amount: sumRowsByPrefix(allRows, ["40"], "debit-minus-credit"),
      sortOrder: 20,
    },
    {
      code: "3.2",
      label: "Ovriga externa kostnader",
      amount: sumRowsByPrefix(allRows, ["50", "54", "60", "65"], "debit-minus-credit"),
      sortOrder: 30,
    },
    {
      code: "4.1",
      label: "Personalkostnader",
      amount: sumRowsByPrefix(allRows, ["70", "75"], "debit-minus-credit"),
      sortOrder: 40,
    },
    {
      code: "4.13",
      label: "Bokslutsdispositioner",
      amount: sumRowsByPrefix(allRows, ["88"], "debit-minus-credit"),
      sortOrder: 50,
    },
    {
      code: "4.14",
      label: "Skatt pa arets resultat",
      amount: sumRowsByPrefix(allRows, ["89"], "debit-minus-credit"),
      sortOrder: 60,
    },
    {
      code: "4.15",
      label: "Arets resultat",
      amount: profitAndLoss.totals.result,
      sortOrder: 70,
    },
    {
      code: "2.1",
      label: "Kassa och bank",
      amount: sumRowsByPrefix(allRows, ["19"], "balance"),
      sortOrder: 80,
    },
    {
      code: "2.2",
      label: "Kundfordringar",
      amount: sumRowsByPrefix(allRows, ["151"], "balance"),
      sortOrder: 90,
    },
    {
      code: "2.6",
      label: "Forutbetalda kostnader och upplupna intakter",
      amount: sumRowsByPrefix(allRows, ["17"], "balance"),
      sortOrder: 100,
    },
    {
      code: "2.14",
      label: "Skulder till kreditinstitut och andra skulder",
      amount: sumRowsByPrefix(allRows, ["25", "26", "27", "29"], "credit-minus-debit"),
      sortOrder: 110,
    },
    {
      code: "2.16",
      label: "Obeskattade reserver / eget kapital-liknande poster",
      amount: sumRowsByPrefix(allRows, ["21"], "credit-minus-debit"),
      sortOrder: 120,
    },
  ];
}

export async function createOrRefreshInk2Run(companyId: string, year: number) {
  const lines = await buildInk2LineDraft(companyId);

  return prisma.$transaction(async (tx) => {
    const run = await tx.ink2ReportRun.upsert({
      where: {
        companyId_year: {
          companyId,
          year,
        },
      },
      update: {
        status: "READY",
      },
      create: {
        companyId,
        year,
        status: "READY",
      },
    });

    await tx.ink2ReportLine.deleteMany({
      where: {
        ink2ReportRunId: run.id,
      },
    });

    await tx.ink2ReportLine.createMany({
      data: lines.map((line) => ({
        ink2ReportRunId: run.id,
        code: line.code,
        label: line.label,
        amount: line.amount,
        sortOrder: line.sortOrder,
      })),
    });

    return tx.ink2ReportRun.findUniqueOrThrow({
      where: {
        id: run.id,
      },
      include: {
        lines: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  });
}
