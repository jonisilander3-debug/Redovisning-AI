import { CustomerPaymentStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { createJournalEntryFromCustomerPaymentInDb } from "@/lib/accounting";
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

export const customerPaymentStatusLabels: Record<CustomerPaymentStatus, string> = {
  UNMATCHED: "Omatchad",
  MATCHED: "Matchad",
  PARTIAL: "Delmatchad",
};

export function getCustomerPaymentStatusTone(status: CustomerPaymentStatus) {
  if (status === "MATCHED") {
    return "success" as const;
  }

  if (status === "PARTIAL") {
    return "accent" as const;
  }

  return "default" as const;
}

export const createCustomerPaymentSchema = z.object({
  invoiceId: z.string().optional().transform((value) => value || ""),
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(160).optional().transform((value) => value || ""),
});

export const importCustomerPaymentsSchema = z.object({
  csv: z.string().min(1),
});

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export async function registerCustomerPayment({
  companyId,
  invoiceId,
  date,
  amount,
  reference,
}: {
  companyId: string;
  invoiceId?: string | null;
  date: Date;
  amount: number;
  reference?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const paymentAmount = roundMoney(decimal(amount));

        let invoice:
      | {
          id: string;
          status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
          totalGross: Prisma.Decimal;
          paidAmount: Prisma.Decimal;
          writtenOffAmount: Prisma.Decimal;
        }
      | null = null;

    if (invoiceId) {
      invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          companyId,
        },
        select: {
          id: true,
          status: true,
          totalGross: true,
          paidAmount: true,
          writtenOffAmount: true,
        },
      });

      if (!invoice) {
        throw new Error("Fakturan kunde inte hittas.");
      }

      if (invoice.status === "DRAFT" || invoice.status === "CANCELLED") {
        throw new Error("Endast skickade fakturor kan matchas mot betalningar.");
      }

      const remainingBeforePayment = roundMoney(
        decimal(invoice.totalGross)
          .sub(decimal(invoice.paidAmount))
          .sub(decimal(invoice.writtenOffAmount)),
      );

      if (paymentAmount.greaterThan(remainingBeforePayment)) {
        throw new Error("Betalningen overstiger fakturans kvarvarande saldo.");
      }
    }

    const payment = await tx.customerPayment.create({
      data: {
        companyId,
        invoiceId: invoice?.id ?? null,
        date,
        amount: paymentAmount,
        reference: reference || null,
        status: invoice ? "UNMATCHED" : "UNMATCHED",
      },
    });

    if (!invoice) {
      return payment;
    }

    const nextPaidAmount = roundMoney(decimal(invoice.paidAmount).add(paymentAmount));
    const remaining = roundMoney(
      decimal(invoice.totalGross)
        .sub(nextPaidAmount)
        .sub(decimal(invoice.writtenOffAmount)),
    );
    const nextStatus =
      remaining.lte(ZERO)
        ? "PAID"
        : nextPaidAmount.greaterThan(ZERO)
          ? "PARTIALLY_PAID"
          : "SENT";

    const journalEntry = await createJournalEntryFromCustomerPaymentInDb(payment.id, tx);

    await tx.customerPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: nextStatus === "PAID" ? "MATCHED" : "PARTIAL",
        journalEntryId: journalEntry?.id ?? null,
      },
    });

    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: nextStatus,
        paidAmount: nextPaidAmount,
        paymentDate: nextStatus === "PAID" ? date : null,
        paymentReference: reference || null,
      },
    });

    return tx.customerPayment.findUniqueOrThrow({
      where: {
        id: payment.id,
      },
    });
  });
}

export async function importCustomerPaymentsFromCsv({
  companyId,
  csv,
}: {
  companyId: string;
  csv: string;
}) {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    throw new Error("CSV-importen maste innehalla rubrikrad och minst en betalning.");
  }

  const header = rows[0].toLowerCase();
  if (!header.includes("date") || !header.includes("amount") || !header.includes("reference")) {
    throw new Error("CSV-importen maste ha kolumnerna date, amount och reference.");
  }

  const createdIds: string[] = [];

  for (const row of rows.slice(1)) {
    const [dateValue, amountValue, referenceValue = ""] = row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Ogiltigt datum i betalningsimporten: ${row}`);
    }

    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Ogiltigt belopp i betalningsimporten: ${row}`);
    }

    const payment = await prisma.customerPayment.create({
      data: {
        companyId,
        date,
        amount: roundMoney(decimal(amount)),
        reference: referenceValue || null,
        source: "IMPORT",
        status: "UNMATCHED",
      },
      select: {
        id: true,
      },
    });

    createdIds.push(payment.id);
  }

  return createdIds;
}
