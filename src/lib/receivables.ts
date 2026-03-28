import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createJournalEntryFromInvoiceWriteOffInDb } from "@/lib/accounting";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

function decimal(value: Prisma.Decimal | number | string | null | undefined) {
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

export const createInvoiceWriteOffSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().max(300).optional().transform((value) => value || ""),
});

export async function createInvoiceWriteOff({
  companyId,
  invoiceId,
  date,
  amount,
  reason,
}: {
  companyId: string;
  invoiceId: string;
  date: Date;
  amount: number;
  reason?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId,
      },
      select: {
        id: true,
        totalGross: true,
        paidAmount: true,
        writtenOffAmount: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new Error("Fakturan kunde inte hittas.");
    }

    if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
      throw new Error("Only sent invoices can be written off.");
    }

    const remaining = roundMoney(
      decimal(invoice.totalGross)
        .sub(decimal(invoice.paidAmount))
        .sub(decimal(invoice.writtenOffAmount)),
    );
    const writeOffAmount = roundMoney(decimal(amount));

    if (writeOffAmount.greaterThan(remaining)) {
      throw new Error("Write-off amount exceeds the remaining invoice balance.");
    }

    const writeOff = await tx.invoiceWriteOff.create({
      data: {
        companyId,
        invoiceId: invoice.id,
        date,
        amount: writeOffAmount,
        reason: reason || null,
      },
    });

    const journalEntry = await createJournalEntryFromInvoiceWriteOffInDb(writeOff.id, tx);
    const nextWrittenOffAmount = roundMoney(decimal(invoice.writtenOffAmount).add(writeOffAmount));
    const nextRemaining = roundMoney(
      decimal(invoice.totalGross)
        .sub(decimal(invoice.paidAmount))
        .sub(nextWrittenOffAmount),
    );

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        writtenOffAmount: nextWrittenOffAmount,
        status: nextRemaining.lte(ZERO) ? "PAID" : invoice.status,
      },
    });

    return tx.invoiceWriteOff.update({
      where: {
        id: writeOff.id,
      },
      data: {
        journalEntryId: journalEntry?.id ?? null,
      },
    });
  });
}
