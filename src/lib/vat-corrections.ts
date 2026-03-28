import { Prisma } from "@prisma/client";
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

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export const createVatAdjustmentSchema = z.object({
  date: z.string().min(1),
  description: z.string().trim().min(2).max(240),
  outputVatDelta: z.coerce.number().default(0),
  inputVatDelta: z.coerce.number().default(0),
});

export async function createVatAdjustment({
  companyId,
  vatReportRunId,
  date,
  description,
  outputVatDelta,
  inputVatDelta,
}: {
  companyId: string;
  vatReportRunId: string;
  date: Date;
  description: string;
  outputVatDelta: number;
  inputVatDelta: number;
}) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.vatReportRun.findFirst({
      where: {
        id: vatReportRunId,
        companyId,
      },
      select: {
        id: true,
        lockedAt: true,
        periodEnd: true,
        outputVat25: true,
        inputVat: true,
        netVatPayable: true,
        journalEntryCount: true,
      },
    });

    if (!report) {
      throw new Error("Momsrapporten kunde inte hittas.");
    }

    if (!report.lockedAt) {
      throw new Error("Las momsrapporten forst innan du skapar en momsrattelse.");
    }

    if (date <= report.periodEnd) {
      throw new Error("Momsrattelsen maste bokforas i en senare, oppen period an den lasta momsperioden.");
    }

    const [outputVatAccount, inputVatAccount, vatSettlementAccount] = await Promise.all([
      tx.account.findFirst({ where: { companyId, number: "2611" }, select: { id: true } }),
      tx.account.findFirst({ where: { companyId, number: "2641" }, select: { id: true } }),
      tx.account.findFirst({ where: { companyId, number: "2650" }, select: { id: true } }),
    ]);

    if (!outputVatAccount || !inputVatAccount || !vatSettlementAccount) {
      throw new Error("Konton 2611, 2641 och 2650 maste finnas for momsrattelser.");
    }

    const outputDelta = roundMoney(decimal(outputVatDelta));
    const inputDelta = roundMoney(decimal(inputVatDelta));

    if (outputDelta.equals(ZERO) && inputDelta.equals(ZERO)) {
      throw new Error("Ange minst en momsjustering for att skapa en rattelse.");
    }

    const lines: Array<{
      accountId: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      description: string;
    }> = [];

    if (outputDelta.greaterThan(ZERO)) {
      lines.push(
        {
          accountId: vatSettlementAccount.id,
          debit: outputDelta,
          credit: ZERO,
          description,
        },
        {
          accountId: outputVatAccount.id,
          debit: ZERO,
          credit: outputDelta,
          description,
        },
      );
    } else if (outputDelta.lessThan(ZERO)) {
      const abs = outputDelta.abs();
      lines.push(
        {
          accountId: outputVatAccount.id,
          debit: abs,
          credit: ZERO,
          description,
        },
        {
          accountId: vatSettlementAccount.id,
          debit: ZERO,
          credit: abs,
          description,
        },
      );
    }

    if (inputDelta.greaterThan(ZERO)) {
      lines.push(
        {
          accountId: inputVatAccount.id,
          debit: inputDelta,
          credit: ZERO,
          description,
        },
        {
          accountId: vatSettlementAccount.id,
          debit: ZERO,
          credit: inputDelta,
          description,
        },
      );
    } else if (inputDelta.lessThan(ZERO)) {
      const abs = inputDelta.abs();
      lines.push(
        {
          accountId: vatSettlementAccount.id,
          debit: abs,
          credit: ZERO,
          description,
        },
        {
          accountId: inputVatAccount.id,
          debit: ZERO,
          credit: abs,
          description,
        },
      );
    }

    const adjustment = await tx.vatAdjustment.create({
      data: {
        companyId,
        vatReportRunId: report.id,
        date,
        outputVatDelta: outputDelta,
        inputVatDelta: inputDelta,
        description,
      },
    });

    const journalEntry = await createManualJournalEntryInDb(
      {
        companyId,
        date,
        description,
        sourceId: `vat-adjustment:${adjustment.id}`,
        status: "POSTED",
        lines,
      },
      tx,
    );

    await tx.vatAdjustment.update({
      where: { id: adjustment.id },
      data: { journalEntryId: journalEntry.id },
    });

    const nextOutput = roundMoney(report.outputVat25.add(outputDelta));
    const nextInput = roundMoney(report.inputVat.add(inputDelta));
    const nextNet = roundMoney(nextOutput.sub(nextInput));

    await tx.vatReportRun.update({
      where: { id: report.id },
      data: {
        outputVat25: nextOutput,
        inputVat: nextInput,
        netVatPayable: nextNet,
        journalEntryCount: report.journalEntryCount + 1,
      },
    });

    return adjustment;
  });
}
