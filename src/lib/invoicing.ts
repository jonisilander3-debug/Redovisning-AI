import {
  InvoiceMode,
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { createInvoiceFromDraftPreview, invoiceDraftSchema } from "@/lib/billing";
import { generateInvoiceNumber } from "@/lib/invoice-numbering";
import { invoiceModeLabels } from "@/lib/invoice-modes";
import { prisma } from "@/lib/prisma";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Utkast",
  SENT: "Skickad",
  PARTIALLY_PAID: "Delbetald",
  PAID: "Betald",
  CANCELLED: "Makulerad",
};

export const invoiceLineTypeLabels: Record<InvoiceLineType, string> = {
  TIME: "Tid",
  MATERIAL: "Material",
  MANUAL: "Manuell",
};

export const invoiceModeDisplayLabels: Record<InvoiceMode, string> = invoiceModeLabels;

export function getInvoiceStatusLabel(status: InvoiceStatus) {
  return invoiceStatusLabels[status];
}

export function getInvoiceStatusTone(status: InvoiceStatus) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "SENT") {
    return "primary" as const;
  }

  if (status === "PARTIALLY_PAID") {
    return "accent" as const;
  }

  if (status === "CANCELLED") {
    return "danger" as const;
  }

  return "accent" as const;
}

export function formatCurrency(
  value: Prisma.Decimal | number | string,
  locale = "sv-SE",
  currency = "SEK",
) {
  const numericValue =
    value instanceof Prisma.Decimal ? Number(value.toString()) : Number(value);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function decimalFromNumber(value: number | string | Prisma.Decimal) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value);
}

export const createMaterialEntrySchema = z.object({
  projectId: z.string().min(1),
  description: z.string().trim().min(2).max(240),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  isBillable: z.coerce.boolean().default(true),
  supplierName: z.string().trim().max(160).optional().transform((value) => value || ""),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  receiptDate: z.string().optional().transform((value) => value || ""),
  receiptUrl: z.string().trim().url().optional().or(z.literal("")).transform((value) => value || ""),
});

export const createInvoiceFromProjectSchema = invoiceDraftSchema;

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
});

export const createCreditNoteSchema = z.object({
  issueDate: z.string().optional().transform((value) => value || ""),
  dueDate: z.string().optional().transform((value) => value || ""),
});

export function parseOptionalDate(value?: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export async function createInvoiceFromProject(
  projectId: string,
  options: {
    companyId: string;
    vatRate?: number;
    defaultHourlyRate?: number;
    issueDate?: Date;
    dueDate?: Date;
  },
) {
  return createInvoiceFromDraftPreview(projectId, {
    companyId: options.companyId,
    invoiceMode: "PROJECT_FINAL",
    vatRate: options.vatRate,
    defaultHourlyRate: options.defaultHourlyRate,
    issueDate: options.issueDate,
    dueDate: options.dueDate,
  });
}

export function isInvoiceOverdue(invoice: {
  status: InvoiceStatus;
  dueDate: Date;
  totalGross: Prisma.Decimal | string;
  paidAmount: Prisma.Decimal | string;
  writtenOffAmount?: Prisma.Decimal | string;
}) {
  if (invoice.status !== "SENT" && invoice.status !== "PARTIALLY_PAID") {
    return false;
  }

  const remaining = decimalFromNumber(invoice.totalGross)
    .sub(decimalFromNumber(invoice.paidAmount))
    .sub(decimalFromNumber(invoice.writtenOffAmount ?? 0));

  return remaining.greaterThan(0) && invoice.dueDate < new Date();
}

export async function createCreditNoteFromInvoice(
  invoiceId: string,
  options: {
    companyId: string;
    issueDate?: Date;
    dueDate?: Date;
  },
) {
  const issueDate = options.issueDate ?? new Date();
  const dueDate = options.dueDate ?? issueDate;

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: invoiceId,
        companyId: options.companyId,
      },
      include: {
        lines: true,
      },
    });

    if (!invoice) {
      throw new Error("That invoice could not be found.");
    }

    const invoiceNumber = await generateInvoiceNumber(options.companyId, tx, issueDate);

    const lines = invoice.lines.map((line) => ({
      companyId: options.companyId,
      type: line.type,
      description: `Kredit ${line.description}`,
      quantity: line.quantity.neg(),
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
      totalNet: line.totalNet.neg(),
      totalVat: line.totalVat.neg(),
      totalGross: line.totalGross.neg(),
      sourceTimeEntryId: null,
      sourceMaterialId: null,
    }));

    return tx.invoice.create({
      data: {
        companyId: options.companyId,
        projectId: invoice.projectId,
        customerName: invoice.customerName,
        status: "DRAFT",
        invoiceNumber,
        issueDate,
        dueDate,
        totalNet: invoice.totalNet.neg(),
        totalVat: invoice.totalVat.neg(),
        totalGross: invoice.totalGross.neg(),
        isCreditNote: true,
        creditNoteOfInvoiceId: invoice.id,
        lines: {
          create: lines,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
      },
    });
  });
}
