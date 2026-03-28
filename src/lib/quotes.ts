import { Prisma, ProjectCommercialBasisType, ProjectStatus, QuoteLineType, QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const HUNDRED = new Prisma.Decimal(100);

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Offertutkast",
  SENT: "Skickad",
  ACCEPTED: "Accepterad",
  REJECTED: "Nekad",
  EXPIRED: "Förfallen",
};

export const quoteLineTypeLabels: Record<QuoteLineType, string> = {
  LABOR: "Arbete",
  MATERIAL: "Material",
  FIXED: "Fast pris",
  OTHER: "Övrigt",
};

export function getQuoteStatusTone(status: QuoteStatus) {
  if (status === "ACCEPTED") return "success" as const;
  if (status === "SENT") return "primary" as const;
  if (status === "REJECTED" || status === "EXPIRED") return "danger" as const;
  return "accent" as const;
}

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function buildLineTotals(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal, vatRate: Prisma.Decimal) {
  const totalNet = roundMoney(quantity.mul(unitPrice));
  const totalVat = roundMoney(totalNet.mul(vatRate).div(HUNDRED));
  const totalGross = roundMoney(totalNet.add(totalVat));
  return { totalNet, totalVat, totalGross };
}

export const quoteLineInputSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(QuoteLineType),
  description: z.string().trim().min(1).max(240),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(25),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const quoteSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().transform((value) => value || ""),
  issueDate: z.string().min(1),
  validUntil: z.string().optional().transform((value) => value || ""),
  status: z.nativeEnum(QuoteStatus).default("DRAFT"),
  lines: z.array(quoteLineInputSchema).min(1),
});

export function parseOptionalDate(value?: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00`);
}

export async function generateQuoteNumber(companyId: string, issueDate = new Date()) {
  const year = issueDate.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const latest = await prisma.quote.findFirst({
    where: {
      companyId,
      issueDate: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
    orderBy: {
      quoteNumber: "desc",
    },
    select: {
      quoteNumber: true,
    },
  });

  const previousSequence = latest?.quoteNumber ? Number(latest.quoteNumber.split("-")[1] ?? "0") : 0;
  return `${year}-${(previousSequence + 1).toString().padStart(4, "0")}`;
}

function buildQuoteLineData(line: z.infer<typeof quoteLineInputSchema>) {
  const quantity = new Prisma.Decimal(line.quantity);
  const unitPrice = new Prisma.Decimal(line.unitPrice);
  const vatRate = new Prisma.Decimal(line.vatRate);
  const totals = buildLineTotals(quantity, unitPrice, vatRate);

  return {
    type: line.type,
    description: line.description,
    quantity,
    unitPrice,
    vatRate,
    totalNet: totals.totalNet,
    totalVat: totals.totalVat,
    totalGross: totals.totalGross,
    sortOrder: line.sortOrder,
  };
}

export async function getQuoteCommercialSummary(quoteId: string, companyId: string) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
  });

  if (!quote) {
    throw new Error("Offerten kunde inte hittas.");
  }

  const project = quote.projectId
    ? await prisma.project.findFirst({
        where: {
          id: quote.projectId,
          companyId,
        },
        include: {
          invoices: {
            where: {
              status: { not: "CANCELLED" },
            },
            select: {
              totalGross: true,
              paidAmount: true,
              writtenOffAmount: true,
            },
          },
        },
      })
    : null;

  const billedGross = project?.invoices.reduce((sum, invoice) => sum.add(invoice.totalGross), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
  const paidGross = project?.invoices.reduce((sum, invoice) => sum.add(invoice.paidAmount), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
  const outstandingGross =
    project?.invoices.reduce((sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount)), new Prisma.Decimal(0)) ??
    new Prisma.Decimal(0);

  return {
    quotedNet: quote.totalNet,
    quotedGross: quote.totalGross,
    billedGross,
    paidGross,
    outstandingGross,
    remainingGross: quote.totalGross.sub(billedGross),
  };
}

export async function convertAcceptedQuoteToProject({
  quoteId,
  companyId,
}: {
  quoteId: string;
  companyId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: {
        id: quoteId,
        companyId,
      },
      include: {
        customer: true,
        lines: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!quote) {
      throw new Error("Offerten kunde inte hittas.");
    }
    if (quote.status !== "ACCEPTED") {
      throw new Error("Endast accepterade offerter kan omvandlas till projekt.");
    }
    if (quote.projectId) {
      throw new Error("Offerten är redan kopplad till ett projekt.");
    }

    const laborBudget = quote.lines
      .filter((line) => line.type === "LABOR")
      .reduce((sum, line) => sum.add(line.totalNet), new Prisma.Decimal(0));
    const materialBudget = quote.lines
      .filter((line) => line.type === "MATERIAL")
      .reduce((sum, line) => sum.add(line.totalNet), new Prisma.Decimal(0));

    const project = await tx.project.create({
      data: {
        companyId,
        customerId: quote.customerId,
        quoteId: quote.id,
        customerName: quote.customer.name,
        title: quote.title,
        description: quote.description,
        status: ProjectStatus.PLANNED,
        commercialBasisType: ProjectCommercialBasisType.QUOTE,
        budgetNet: quote.totalNet,
        budgetGross: quote.totalGross,
        budgetLaborValue: laborBudget,
        budgetMaterialValue: materialBudget,
      },
      select: {
        id: true,
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: {
        projectId: project.id,
      },
    });

    return project;
  });
}

export async function createQuote(companyId: string, input: z.infer<typeof quoteSchema>) {
  const issueDate = parseOptionalDate(input.issueDate) ?? new Date();
  const validUntil = parseOptionalDate(input.validUntil);
  const quoteNumber = await generateQuoteNumber(companyId, issueDate);
  const lineItems = input.lines.map(buildQuoteLineData);
  const totals = lineItems.reduce(
    (sum, line) => ({
      totalNet: sum.totalNet.add(line.totalNet),
      totalVat: sum.totalVat.add(line.totalVat),
      totalGross: sum.totalGross.add(line.totalGross),
    }),
    {
      totalNet: new Prisma.Decimal(0),
      totalVat: new Prisma.Decimal(0),
      totalGross: new Prisma.Decimal(0),
    },
  );

  return prisma.quote.create({
    data: {
      companyId,
      customerId: input.customerId,
      quoteNumber,
      status: input.status,
      title: input.title,
      description: input.description || null,
      issueDate,
      validUntil,
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      acceptedAt: input.status === "ACCEPTED" ? new Date() : null,
      lines: {
        create: lineItems,
      },
    },
  });
}

export async function updateQuote(quoteId: string, companyId: string, input: z.infer<typeof quoteSchema>) {
  const issueDate = parseOptionalDate(input.issueDate) ?? new Date();
  const validUntil = parseOptionalDate(input.validUntil);
  const lineItems = input.lines.map(buildQuoteLineData);
  const totals = lineItems.reduce(
    (sum, line) => ({
      totalNet: sum.totalNet.add(line.totalNet),
      totalVat: sum.totalVat.add(line.totalVat),
      totalGross: sum.totalGross.add(line.totalGross),
    }),
    {
      totalNet: new Prisma.Decimal(0),
      totalVat: new Prisma.Decimal(0),
      totalGross: new Prisma.Decimal(0),
    },
  );

  return prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findFirst({
      where: {
        id: quoteId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error("Offerten kunde inte hittas.");
    }

    await tx.quoteLine.deleteMany({
      where: {
        quoteId,
      },
    });

    return tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: input.customerId,
        title: input.title,
        description: input.description || null,
        issueDate,
        validUntil,
        status: input.status,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
        acceptedAt: input.status === "ACCEPTED" ? new Date() : null,
        lines: {
          create: lineItems,
        },
      },
    });
  });
}
