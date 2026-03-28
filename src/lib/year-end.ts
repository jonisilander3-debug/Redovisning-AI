import { LegalForm, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);
const CORPORATE_TAX_RATE = new Prisma.Decimal("0.206");

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function getYearRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

export const createYearEndTaxEntrySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export function getEstimatedTaxRate(legalForm: LegalForm) {
  return legalForm === "LIMITED_COMPANY" ? CORPORATE_TAX_RATE : ZERO;
}

export async function getYearEndSummary(
  companyId: string,
  legalForm: LegalForm,
  year: number,
) {
  const { start, end } = getYearRange(year);
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        status: "POSTED",
        date: {
          gte: start,
          lte: end,
        },
      },
      account: {
        type: {
          in: ["REVENUE", "EXPENSE"],
        },
      },
    },
    include: {
      account: {
        select: {
          id: true,
          number: true,
          name: true,
          type: true,
        },
      },
      journalEntry: {
        select: {
          id: true,
          date: true,
          description: true,
          sourceType: true,
        },
      },
    },
    orderBy: [{ journalEntry: { date: "asc" } }, { id: "asc" }],
  });

  const revenue = lines
    .filter((line) => line.account.type === "REVENUE")
    .reduce((sum, line) => sum.add(line.credit).sub(line.debit), ZERO);
  const expenses = lines
    .filter((line) => line.account.type === "EXPENSE")
    .reduce((sum, line) => sum.add(line.debit).sub(line.credit), ZERO);

  const resultBeforeTax = roundMoney(revenue.sub(expenses));
  const estimatedTaxRate = getEstimatedTaxRate(legalForm);
  const taxableBase = resultBeforeTax.greaterThan(ZERO) ? resultBeforeTax : ZERO;
  const estimatedTax = roundMoney(taxableBase.mul(estimatedTaxRate));
  const resultAfterTax = roundMoney(resultBeforeTax.sub(estimatedTax));

  const existingTaxEntry = await prisma.journalEntry.findFirst({
    where: {
      companyId,
      sourceType: "YEAR_END",
      sourceId: `year-end-tax:${year}`,
    },
    select: {
      id: true,
      date: true,
      status: true,
      description: true,
    },
  });

  return {
    periodStart: start,
    periodEnd: end,
    totals: {
      revenue: roundMoney(revenue),
      expenses: roundMoney(expenses),
      resultBeforeTax,
      estimatedTaxRate,
      estimatedTax,
      resultAfterTax,
    },
    ink2Preview: {
      netSales: roundMoney(revenue),
      operatingExpenses: roundMoney(expenses),
      resultAfterFinancialItems: resultBeforeTax,
      estimatedCurrentTax: estimatedTax,
    },
    existingTaxEntry,
  };
}

export async function createYearEndTaxJournalEntry(
  companyId: string,
  legalForm: LegalForm,
  year: number,
) {
  if (legalForm !== "LIMITED_COMPANY") {
    throw new Error(
      "Automatisk skatteskuld ar bara aktiverad for aktiebolag i den har versionen.",
    );
  }

  const summary = await getYearEndSummary(companyId, legalForm, year);

  if (summary.existingTaxEntry) {
    throw new Error("Det finns redan en arsbokslutspost for skatt det har aret.");
  }

  if (summary.totals.estimatedTax.lte(ZERO)) {
    throw new Error("Det finns ingen positiv bolagsskatt att boka upp for det har aret.");
  }

  const [taxExpenseAccount, taxLiabilityAccount] = await Promise.all([
    prisma.account.findFirst({
      where: {
        companyId,
        number: "8910",
      },
      select: {
        id: true,
      },
    }),
    prisma.account.findFirst({
      where: {
        companyId,
        number: "2510",
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!taxExpenseAccount || !taxLiabilityAccount) {
    throw new Error("Standardkonton for skatt saknas. Seed BAS-konton forst.");
  }

  return prisma.journalEntry.create({
    data: {
      companyId,
      date: summary.periodEnd,
      description: `Arsbokslut skatt ${year}`,
      sourceType: "YEAR_END",
      sourceId: `year-end-tax:${year}`,
      status: "POSTED",
      lines: {
        create: [
          {
            accountId: taxExpenseAccount.id,
            debit: summary.totals.estimatedTax,
            credit: ZERO,
            description: `Beraknad skatt ${year}`,
          },
          {
            accountId: taxLiabilityAccount.id,
            debit: ZERO,
            credit: summary.totals.estimatedTax,
            description: `Skatteskuld ${year}`,
          },
        ],
      },
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
