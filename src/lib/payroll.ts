import {
  AbsenceType,
  PayrollPaymentStatus,
  PayrollRunStatus,
  Prisma,
  SalaryType,
} from "@prisma/client";
import { createJournalEntryFromPayrollRunInDb } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

function decimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (value === null || typeof value === "undefined") {
    return ZERO;
  }

  return new Prisma.Decimal(value);
}

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

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

function formatPeriodLabel(periodStart: Date, periodEnd: Date) {
  return `Lon ${periodStart.toISOString().slice(0, 10)}-${periodEnd.toISOString().slice(0, 10)}`;
}

function getWorkedHours(entry: { startTime: Date; endTime: Date | null }) {
  const endTime = entry.endTime ?? entry.startTime;
  const minutes = Math.max(
    0,
    Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000),
  );

  return roundMoney(decimal(minutes).div(60));
}

export const payrollRunStatusLabels: Record<PayrollRunStatus, string> = {
  DRAFT: "Utkast",
  FINALIZED: "Finaliserad",
  PAID: "Betald",
};

export const payrollPaymentStatusLabels: Record<PayrollPaymentStatus, string> = {
  UNPAID: "Inte utbetald",
  PAYMENT_FILE_READY: "Betalfil klar",
  PAID: "Betald",
};

export function getPayrollRunStatusTone(status: PayrollRunStatus) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "FINALIZED") {
    return "accent" as const;
  }

  return "default" as const;
}

export function getPayrollPaymentStatusTone(status: PayrollPaymentStatus) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "PAYMENT_FILE_READY") {
    return "accent" as const;
  }

  return "default" as const;
}

function getSalaryTypeLabel(type: SalaryType) {
  return type === "MONTHLY" ? "Manadslon" : "Timlon";
}

function getAbsenceHours(entry: {
  quantityHours: Prisma.Decimal | null;
  quantityDays: Prisma.Decimal | null;
}) {
  if (entry.quantityHours) {
    return decimal(entry.quantityHours);
  }

  if (entry.quantityDays) {
    return decimal(entry.quantityDays).mul(8);
  }

  return ZERO;
}

function shouldReduceSalaryForAbsence(type: AbsenceType) {
  return type === "SICK" || type === "VAB" || type === "UNPAID_LEAVE";
}

function shouldCountAsVacation(type: AbsenceType) {
  return type === "VACATION";
}

export async function createPayrollRun(companyId: string, periodStart: Date, periodEnd: Date) {
  const normalizedStart = startOfDay(periodStart);
  const normalizedEnd = endOfDay(periodEnd);

  if (normalizedEnd < normalizedStart) {
    throw new Error("Periodens slutdatum maste vara samma dag eller senare an startdatumet.");
  }

  const existingRun = await prisma.payrollRun.findFirst({
    where: {
      companyId,
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
    },
    select: {
      id: true,
    },
  });

  if (existingRun) {
    throw new Error("Det finns redan en lonekorning for den har perioden.");
  }

  const employees = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        {
          companyId,
        },
        {
          companyMemberships: {
            some: {
              companyId,
            },
          },
        },
      ],
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      salaryType: true,
      hourlyRate: true,
      monthlySalary: true,
      taxPercent: true,
      employerContributionRate: true,
      absenceEntries: {
        where: {
          companyId,
          status: "APPROVED",
          startDate: {
            lte: normalizedEnd,
          },
          endDate: {
            gte: normalizedStart,
          },
        },
        select: {
          id: true,
          type: true,
          quantityDays: true,
          quantityHours: true,
        },
      },
      benefitEntries: {
        where: {
          companyId,
          status: "APPROVED",
          date: {
            gte: normalizedStart,
            lte: normalizedEnd,
          },
        },
        select: {
          id: true,
          taxableAmount: true,
        },
      },
      timeEntries: {
        where: {
          companyId,
          status: "COMPLETED",
          date: {
            gte: normalizedStart,
            lte: normalizedEnd,
          },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (employees.length === 0) {
    throw new Error("Det finns inga aktiva medarbetare att skapa lonekorning for.");
  }

  const runData = employees
    .map((employee) => {
      const hoursWorked = employee.timeEntries.reduce(
        (sum, entry) => sum.add(getWorkedHours(entry)),
        ZERO,
      );
      const hourlyRate = decimal(employee.hourlyRate);
      const monthlySalary = decimal(employee.monthlySalary);
      const taxPercent = decimal(employee.taxPercent ?? 30);
      const employerContributionRate = decimal(employee.employerContributionRate ?? 31.42);
      const absenceHours = employee.absenceEntries.reduce(
        (sum, entry) => sum.add(getAbsenceHours(entry)),
        ZERO,
      );
      const vacationHours = employee.absenceEntries.reduce(
        (sum, entry) =>
          shouldCountAsVacation(entry.type)
            ? sum.add(getAbsenceHours(entry))
            : sum,
        ZERO,
      );
      const sickHours = employee.absenceEntries.reduce(
        (sum, entry) =>
          entry.type === "SICK"
            ? sum.add(getAbsenceHours(entry))
            : sum,
        ZERO,
      );
      const vabHours = employee.absenceEntries.reduce(
        (sum, entry) =>
          entry.type === "VAB"
            ? sum.add(getAbsenceHours(entry))
            : sum,
        ZERO,
      );
      const unpaidLeaveHours = employee.absenceEntries.reduce(
        (sum, entry) =>
          entry.type === "UNPAID_LEAVE"
            ? sum.add(getAbsenceHours(entry))
            : sum,
        ZERO,
      );
      const salaryReductionHours = employee.absenceEntries.reduce(
        (sum, entry) =>
          shouldReduceSalaryForAbsence(entry.type)
            ? sum.add(getAbsenceHours(entry))
            : sum,
        ZERO,
      );
      const taxableBenefitsAmount = employee.benefitEntries.reduce(
        (sum, entry) => sum.add(decimal(entry.taxableAmount)),
        ZERO,
      );
      const baseHourlyRate =
        employee.salaryType === "MONTHLY"
          ? monthlySalary.div(160)
          : hourlyRate;
      const absenceAdjustmentAmount = roundMoney(baseHourlyRate.mul(salaryReductionHours));
      const sickPayAmount = roundMoney(
        baseHourlyRate.mul(sickHours).mul(decimal(0.8)),
      );
      const vabDeductionAmount = roundMoney(baseHourlyRate.mul(vabHours));
      const unpaidLeaveDeductionAmount = roundMoney(baseHourlyRate.mul(unpaidLeaveHours));
      const karensDeductionAmount = roundMoney(
        baseHourlyRate.mul(sickHours.greaterThan(decimal(8)) ? decimal(8) : sickHours).mul(decimal(0.2)),
      );
      const vacationPayAmount = roundMoney(baseHourlyRate.mul(vacationHours).mul(decimal(0.12)));
      const grossSalaryBeforeAbsence =
        employee.salaryType === "MONTHLY"
          ? roundMoney(monthlySalary)
          : roundMoney(hoursWorked.mul(hourlyRate));
      const grossSalaryCandidate = roundMoney(
        grossSalaryBeforeAbsence
          .sub(absenceAdjustmentAmount)
          .add(vacationPayAmount)
          .add(sickPayAmount),
      );
      const grossSalary = grossSalaryCandidate.lessThan(ZERO)
        ? ZERO
        : grossSalaryCandidate;
      const taxableGrossAmount = roundMoney(grossSalary.add(taxableBenefitsAmount));
      const taxAmount = roundMoney(taxableGrossAmount.mul(taxPercent).div(HUNDRED));
      const employerContribution = roundMoney(
        taxableGrossAmount.mul(employerContributionRate).div(HUNDRED),
      );
      const netSalary = roundMoney(grossSalary.sub(taxAmount));

      return {
        userId: employee.id,
        userName: employee.name,
        salaryType: employee.salaryType,
        salaryTypeLabel: getSalaryTypeLabel(employee.salaryType),
        hoursWorked: roundMoney(hoursWorked),
        absenceHours: roundMoney(absenceHours),
        absenceAdjustmentAmount,
        benefitsAmount: taxableBenefitsAmount,
        taxableBenefitsAmount,
        taxableGrossAmount,
        vacationPayAmount,
        sickPayAmount,
        karensDeductionAmount,
        vabDeductionAmount,
        unpaidLeaveDeductionAmount,
        grossSalary,
        taxAmount,
        employerContribution,
        netSalary,
        timeEntryIds: employee.timeEntries.map((entry) => entry.id),
      };
    })
    .filter((line) => line.grossSalary.greaterThan(ZERO) || line.hoursWorked.greaterThan(ZERO));

  if (runData.length === 0) {
    throw new Error("Ingen lon kunde raknas fram for den valda perioden.");
  }

  const totals = runData.reduce(
    (sum, line) => ({
      totalGross: sum.totalGross.add(line.grossSalary),
      totalTax: sum.totalTax.add(line.taxAmount),
      totalEmployerContribution: sum.totalEmployerContribution.add(line.employerContribution),
      totalNet: sum.totalNet.add(line.netSalary),
    }),
    {
      totalGross: ZERO,
      totalTax: ZERO,
      totalEmployerContribution: ZERO,
      totalNet: ZERO,
    },
  );

  return prisma.payrollRun.create({
    data: {
      companyId,
      title: formatPeriodLabel(normalizedStart, normalizedEnd),
      periodStart: normalizedStart,
      periodEnd: normalizedEnd,
      totalGross: roundMoney(totals.totalGross),
      totalTax: roundMoney(totals.totalTax),
      totalEmployerContribution: roundMoney(totals.totalEmployerContribution),
      totalNet: roundMoney(totals.totalNet),
      lines: {
        create: runData.map((line) => ({
          companyId,
          userId: line.userId,
          hoursWorked: line.hoursWorked,
          grossSalary: line.grossSalary,
          taxAmount: line.taxAmount,
          employerContribution: line.employerContribution,
          netSalary: line.netSalary,
          absenceHours: line.absenceHours,
          absenceAdjustmentAmount: line.absenceAdjustmentAmount,
          benefitsAmount: line.benefitsAmount,
          taxableBenefitsAmount: line.taxableBenefitsAmount,
          taxableGrossAmount: line.taxableGrossAmount,
          vacationPayAmount: line.vacationPayAmount,
          sickPayAmount: line.sickPayAmount,
          karensDeductionAmount: line.karensDeductionAmount,
          vabDeductionAmount: line.vabDeductionAmount,
          unpaidLeaveDeductionAmount: line.unpaidLeaveDeductionAmount,
          payoutReference: `${normalizedEnd.toISOString().slice(0, 10)}-${line.userId.slice(-6)}`,
          timeEntries: {
            create: line.timeEntryIds.map((timeEntryId) => ({
              timeEntryId,
            })),
          },
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
              salaryType: true,
            },
          },
          timeEntries: {
            include: {
              timeEntry: {
                select: {
                  id: true,
                  date: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
  });
}

export async function finalizePayrollRun(payrollRunId: string, companyId?: string) {
  return prisma.$transaction(async (tx) => {
    const payrollRun = await tx.payrollRun.findUnique({
      where: {
        id: payrollRunId,
      },
      include: {
        lines: true,
      },
    });

    if (!payrollRun) {
      throw new Error("Den lonekorningen kunde inte hittas.");
    }

    if (companyId && payrollRun.companyId !== companyId) {
      throw new Error("Den lonekorningen tillhor ett annat bolag.");
    }

    if (payrollRun.status === "PAID") {
      throw new Error("Den har lonekorningen ar redan markerad som betald.");
    }

    if (payrollRun.status === "FINALIZED" && payrollRun.journalEntryId) {
      return payrollRun;
    }

    if (payrollRun.lines.length === 0) {
      throw new Error("Lonekorningen maste ha minst en lonerad innan den kan finaliseras.");
    }

    const journalEntry = await createJournalEntryFromPayrollRunInDb(payrollRun.id, tx);

    if (!journalEntry) {
      throw new Error("Det gick inte att skapa eller hamta loneverifikationen.");
    }

    return tx.payrollRun.update({
      where: {
        id: payrollRun.id,
      },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        journalEntryId: journalEntry.id,
      },
      include: {
        lines: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                salaryType: true,
              },
            },
            timeEntries: {
              include: {
                timeEntry: {
                  select: {
                    id: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                  },
                },
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        },
        journalEntry: true,
      },
    });
  });
}

export async function markPayrollRunPaid(payrollRunId: string, companyId?: string) {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: {
      id: payrollRunId,
    },
    select: {
      id: true,
      companyId: true,
      status: true,
    },
  });

  if (!payrollRun) {
    throw new Error("Den lonekorningen kunde inte hittas.");
  }

  if (companyId && payrollRun.companyId !== companyId) {
    throw new Error("Den lonekorningen tillhor ett annat bolag.");
  }

  if (payrollRun.status !== "FINALIZED") {
    throw new Error("Endast finaliserade lonekorningar kan markeras som betalda.");
  }

  return prisma.payrollRun.update({
    where: {
      id: payrollRun.id,
    },
    data: {
      status: "PAID",
      lines: {
        updateMany: {
          where: {
            paymentStatus: {
              not: "PAID",
            },
          },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
          },
        },
      },
    },
  });
}

export async function preparePayrollPaymentFile(payrollRunId: string, companyId?: string) {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: {
      id: payrollRunId,
    },
    select: {
      id: true,
      companyId: true,
      status: true,
    },
  });

  if (!payrollRun) {
    throw new Error("Den lonekorningen kunde inte hittas.");
  }

  if (companyId && payrollRun.companyId !== companyId) {
    throw new Error("Den lonekorningen tillhor ett annat bolag.");
  }

  if (payrollRun.status === "DRAFT") {
    throw new Error("Finalisera lonekorningen innan du forbereder bankbetalning.");
  }

  return prisma.payrollRun.update({
    where: {
      id: payrollRun.id,
    },
    data: {
      lines: {
        updateMany: {
          where: {
            paymentStatus: "UNPAID",
          },
          data: {
            paymentStatus: "PAYMENT_FILE_READY",
          },
        },
      },
    },
    include: {
      lines: true,
    },
  });
}
