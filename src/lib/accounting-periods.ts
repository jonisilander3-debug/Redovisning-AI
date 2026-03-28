import { AccountingPeriodLockType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbLike = typeof prisma | Prisma.TransactionClient;

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

export const accountingPeriodLockTypeLabels: Record<AccountingPeriodLockType, string> = {
  VAT: "Momsperiod",
  YEAR_END: "Bokslutsperiod",
  MANUAL: "Manuell lasning",
};

export async function findAccountingPeriodLock(
  companyId: string,
  date: Date,
  db: DbLike = prisma,
) {
  return db.accountingPeriodLock.findFirst({
    where: {
      companyId,
      periodStart: {
        lte: date,
      },
      periodEnd: {
        gte: date,
      },
    },
    orderBy: {
      periodEnd: "desc",
    },
  });
}

export async function assertAccountingPeriodOpen(
  companyId: string,
  date: Date,
  db: DbLike = prisma,
) {
  const lock = await findAccountingPeriodLock(companyId, date, db);

  if (lock) {
    throw new Error(
      `Perioden ${lock.periodStart.toISOString().slice(0, 10)}-${lock.periodEnd.toISOString().slice(0, 10)} ar last som ${accountingPeriodLockTypeLabels[lock.type].toLowerCase()}. Bokforing kan inte skapas i en last period.`,
    );
  }
}

export async function ensureAccountingPeriodLock(
  companyId: string,
  type: AccountingPeriodLockType,
  periodStart: Date,
  periodEnd: Date,
  note?: string | null,
  db: DbLike = prisma,
) {
  return db.accountingPeriodLock.upsert({
    where: {
      companyId_type_periodStart_periodEnd: {
        companyId,
        type,
        periodStart: startOfDay(periodStart),
        periodEnd: endOfDay(periodEnd),
      },
    },
    update: {
      note: note ?? null,
    },
    create: {
      companyId,
      type,
      periodStart: startOfDay(periodStart),
      periodEnd: endOfDay(periodEnd),
      note: note ?? null,
    },
  });
}
