import { EmployerDeclarationStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export const employerDeclarationStatusLabels: Record<EmployerDeclarationStatus, string> = {
  DRAFT: "Utkast",
  READY: "Klar for deklaration",
  SUBMITTED: "Skickad",
};

export function getEmployerDeclarationStatusTone(status: EmployerDeclarationStatus) {
  if (status === "SUBMITTED") {
    return "success" as const;
  }

  if (status === "READY") {
    return "accent" as const;
  }

  return "default" as const;
}

export const createEmployerDeclarationRunSchema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export const updateEmployerDeclarationStatusSchema = z.object({
  status: z.nativeEnum(EmployerDeclarationStatus),
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

export async function createEmployerDeclarationRun(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const normalizedStart = startOfDay(periodStart);
  const normalizedEnd = endOfDay(periodEnd);

  const existing = await prisma.employerDeclarationRun.findFirst({
    where: {
      companyId,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error("Det finns redan en AGI-korning for den valda perioden.");
  }

  const payrollRuns = await prisma.payrollRun.findMany({
    where: {
      companyId,
      status: {
        in: ["FINALIZED", "PAID"],
      },
      periodStart: {
        gte: normalizedStart,
      },
      periodEnd: {
        lte: normalizedEnd,
      },
      declarationLinks: {
        none: {},
      },
    },
    include: {
      lines: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      periodEnd: "asc",
    },
  });

  if (payrollRuns.length === 0) {
    throw new Error("Det finns inga finaliserade lonekorningar att ta med i perioden.");
  }

  const employeeTotals = new Map<
    string,
    {
      userId: string;
      grossSalary: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      employerContribution: Prisma.Decimal;
      benefitsAmount: Prisma.Decimal;
      absenceAdjustmentAmount: Prisma.Decimal;
    }
  >();

  for (const payrollRun of payrollRuns) {
    for (const line of payrollRun.lines) {
      const current =
        employeeTotals.get(line.userId) ??
        {
          userId: line.userId,
          grossSalary: ZERO,
          taxAmount: ZERO,
          employerContribution: ZERO,
          benefitsAmount: ZERO,
          absenceAdjustmentAmount: ZERO,
        };

      current.grossSalary = current.grossSalary.add(line.grossSalary);
      current.taxAmount = current.taxAmount.add(line.taxAmount);
      current.employerContribution = current.employerContribution.add(line.employerContribution);
      current.benefitsAmount = current.benefitsAmount.add(line.taxableBenefitsAmount);
      current.absenceAdjustmentAmount = current.absenceAdjustmentAmount.add(
        line.absenceAdjustmentAmount,
      );
      employeeTotals.set(line.userId, current);
    }
  }

  const totals = Array.from(employeeTotals.values()).reduce(
    (sum, line) => ({
      totalGrossSalary: sum.totalGrossSalary.add(line.grossSalary),
      totalTax: sum.totalTax.add(line.taxAmount),
      totalEmployerContribution: sum.totalEmployerContribution.add(line.employerContribution),
    }),
    {
      totalGrossSalary: ZERO,
      totalTax: ZERO,
      totalEmployerContribution: ZERO,
    },
  );

  return prisma.employerDeclarationRun.create({
    data: {
      companyId,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      totalGrossSalary: roundMoney(totals.totalGrossSalary),
      totalTax: roundMoney(totals.totalTax),
      totalEmployerContribution: roundMoney(totals.totalEmployerContribution),
      payrollRuns: {
        create: payrollRuns.map((payrollRun) => ({
          payrollRunId: payrollRun.id,
        })),
      },
      lines: {
        create: Array.from(employeeTotals.values()).map((line) => ({
          companyId,
          userId: line.userId,
          grossSalary: roundMoney(line.grossSalary),
          taxAmount: roundMoney(line.taxAmount),
          employerContribution: roundMoney(line.employerContribution),
          benefitsAmount: roundMoney(line.benefitsAmount),
          absenceAdjustmentAmount: roundMoney(line.absenceAdjustmentAmount),
        })),
      },
    },
    include: {
      lines: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
      payrollRuns: {
        include: {
          payrollRun: {
            select: {
              id: true,
              title: true,
              periodStart: true,
              periodEnd: true,
              status: true,
            },
          },
        },
      },
    },
  });
}
