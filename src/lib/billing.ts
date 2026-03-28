import { InvoiceMode, Prisma, ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { generateInvoiceNumber } from "@/lib/invoice-numbering";
import { invoiceModeLabels } from "@/lib/invoice-modes";
import { prisma } from "@/lib/prisma";

export { invoiceModeLabels, invoiceModeOptions } from "@/lib/invoice-modes";

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

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

function buildLineTotals(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal, vatRate: Prisma.Decimal) {
  const totalNet = roundMoney(quantity.mul(unitPrice));
  const totalVat = roundMoney(totalNet.mul(vatRate).div(HUNDRED));
  const totalGross = roundMoney(totalNet.add(totalVat));
  return { totalNet, totalVat, totalGross };
}

function getWorkedHours(entry: {
  startTime: Date;
  endTime: Date | null;
}) {
  const end = entry.endTime ?? entry.startTime;
  const minutes = Math.max(0, Math.round((end.getTime() - entry.startTime.getTime()) / 60000));
  return roundMoney(decimal(minutes).div(60));
}

function getTimeEntryAvailableQuantity(entry: {
  startTime: Date;
  endTime: Date | null;
  invoicedQuantity: Prisma.Decimal | number | string | null | undefined;
}) {
  const available = roundMoney(getWorkedHours(entry).sub(decimal(entry.invoicedQuantity)));
  return available.greaterThan(ZERO) ? available : ZERO;
}

function getMaterialEntryAvailableQuantity(entry: {
  quantity: Prisma.Decimal | number | string;
  invoicedQuantity: Prisma.Decimal | number | string | null | undefined;
}) {
  const available = roundMoney(decimal(entry.quantity).sub(decimal(entry.invoicedQuantity)));
  return available.greaterThan(ZERO) ? available : ZERO;
}

function getLineKey(sourceType: "TIME" | "MATERIAL", sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

export const invoiceDraftLineSchema = z.object({
  key: z.string().min(1),
  include: z.coerce.boolean().default(true),
  sourceType: z.enum(["TIME", "MATERIAL"]),
  sourceId: z.string().min(1),
  description: z.string().trim().min(1).max(240),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const invoiceDraftSchema = z.object({
  projectId: z.string().min(1),
  invoiceMode: z.nativeEnum(InvoiceMode).default("PROJECT_FINAL"),
  vatRate: z.coerce.number().min(0).max(100).default(25),
  defaultHourlyRate: z.coerce.number().min(0).optional(),
  issueDate: z.string().optional().transform((value) => value || ""),
  dueDate: z.string().optional().transform((value) => value || ""),
  billingPeriodStart: z.string().optional().transform((value) => value || ""),
  billingPeriodEnd: z.string().optional().transform((value) => value || ""),
  selectedTimeEntryIds: z.array(z.string()).default([]),
  selectedMaterialEntryIds: z.array(z.string()).default([]),
  customerId: z.string().optional().transform((value) => value || ""),
  draftLines: z.array(invoiceDraftLineSchema).default([]),
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

export async function getProjectBillableTime(
  projectId: string,
  options?: {
    companyId?: string;
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    selectedTimeEntryIds?: string[];
    db?: PrismaClientLike;
  },
) {
  const db = options?.db ?? prisma;
  const where: Prisma.TimeEntryWhereInput = {
    projectId,
    status: "COMPLETED",
    isBillable: true,
  };

  if (options?.companyId) {
    where.companyId = options.companyId;
  }
  if (options?.billingPeriodStart || options?.billingPeriodEnd) {
    where.date = {
      gte: options.billingPeriodStart ?? undefined,
      lte: options.billingPeriodEnd ?? undefined,
    };
  }
  if (options?.selectedTimeEntryIds?.length) {
    where.id = { in: options.selectedTimeEntryIds };
  }

  const entries = await db.timeEntry.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return entries.filter((entry) => getTimeEntryAvailableQuantity(entry).greaterThan(ZERO));
}

export async function getProjectBillableMaterials(
  projectId: string,
  options?: {
    companyId?: string;
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    selectedMaterialEntryIds?: string[];
    db?: PrismaClientLike;
  },
) {
  const db = options?.db ?? prisma;
  const where: Prisma.MaterialEntryWhereInput = {
    projectId,
    isBillable: true,
  };

  if (options?.companyId) {
    where.companyId = options.companyId;
  }
  if (options?.billingPeriodStart || options?.billingPeriodEnd) {
    where.AND = [
      {
        OR: [
          {
            receiptDate: {
              gte: options.billingPeriodStart ?? undefined,
              lte: options.billingPeriodEnd ?? undefined,
            },
          },
          {
            receiptDate: null,
            createdAt: {
              gte: options.billingPeriodStart ?? undefined,
              lte: options.billingPeriodEnd ?? undefined,
            },
          },
        ],
      },
    ];
  }
  if (options?.selectedMaterialEntryIds?.length) {
    where.id = { in: options.selectedMaterialEntryIds };
  }

  const entries = await db.materialEntry.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }],
  });

  return entries.filter((entry) => getMaterialEntryAvailableQuantity(entry).greaterThan(ZERO));
}

export async function getProjectBillingSummary(projectId: string, companyId?: string) {
  const [project, availableTimeEntries, availableMaterials, invoices] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
      },
    }),
    getProjectBillableTime(projectId, { companyId }),
    getProjectBillableMaterials(projectId, { companyId }),
    prisma.invoice.findMany({
      where: {
        projectId,
        ...(companyId ? { companyId } : {}),
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        status: true,
        totalGross: true,
        paidAmount: true,
        writtenOffAmount: true,
        isCreditNote: true,
        dueDate: true,
        issueDate: true,
      },
    }),
  ]);

  if (!project) {
    throw new Error("Projektet kunde inte hittas.");
  }

  const unbilledTimeValue = availableTimeEntries.reduce((sum, entry) => {
    const availableHours = getTimeEntryAvailableQuantity(entry);
    const rate = entry.hourlyRate ?? ZERO;
    return sum.add(availableHours.mul(rate));
  }, ZERO);
  const unbilledMaterialValue = availableMaterials.reduce((sum, entry) => {
    const remainingQty = getMaterialEntryAvailableQuantity(entry);
    return sum.add(remainingQty.mul(entry.unitPrice));
  }, ZERO);
  const totalBilledAmount = invoices.reduce(
    (sum, invoice) => sum.add(invoice.isCreditNote ? invoice.totalGross.neg() : invoice.totalGross),
    ZERO,
  );
  const totalPaidAmount = invoices.reduce(
    (sum, invoice) => sum.add(invoice.isCreditNote ? invoice.paidAmount.neg() : invoice.paidAmount),
    ZERO,
  );
  const outstandingReceivables = invoices.reduce(
    (sum, invoice) => sum.add(invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount)),
    ZERO,
  );
  const now = new Date();
  const overdueInvoiceCount = invoices.filter(
    (invoice) =>
      (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID") &&
      invoice.dueDate < now &&
      invoice.totalGross.sub(invoice.paidAmount).sub(invoice.writtenOffAmount).greaterThan(ZERO),
  ).length;
  const lastInvoiceDate =
    invoices
      .slice()
      .sort((left, right) => right.issueDate.getTime() - left.issueDate.getTime())[0]
      ?.issueDate ?? null;

  return {
    unbilledTimeValue: roundMoney(unbilledTimeValue),
    unbilledMaterialValue: roundMoney(unbilledMaterialValue),
    totalUnbilledValue: roundMoney(unbilledTimeValue.add(unbilledMaterialValue)),
    totalBilledAmount: roundMoney(totalBilledAmount),
    totalPaidAmount: roundMoney(totalPaidAmount),
    outstandingReceivables: roundMoney(outstandingReceivables),
    remainingBillableAmount: roundMoney(unbilledTimeValue.add(unbilledMaterialValue)),
    unbilledTimeCount: availableTimeEntries.length,
    unbilledMaterialCount: availableMaterials.length,
    invoiceCount: invoices.length,
    overdueInvoiceCount,
    lastInvoiceDate,
  };
}

type DraftPreviewOptions = {
  companyId: string;
  invoiceMode: InvoiceMode;
  vatRate?: number;
  defaultHourlyRate?: number;
  issueDate?: Date | null;
  dueDate?: Date | null;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  selectedTimeEntryIds?: string[];
  selectedMaterialEntryIds?: string[];
  customerId?: string | null;
  draftLines?: Array<z.infer<typeof invoiceDraftLineSchema>>;
};

export function getProjectBillingSuggestion({
  projectStatus,
  totalUnbilledValue,
  lastInvoiceDate,
  invoiceCount,
}: {
  projectStatus: ProjectStatus;
  totalUnbilledValue: Prisma.Decimal;
  lastInvoiceDate: Date | null;
  invoiceCount: number;
}) {
  const now = new Date();
  const daysSinceLastInvoice = lastInvoiceDate
    ? Math.floor((now.getTime() - lastInvoiceDate.getTime()) / 86400000)
    : null;

  if (projectStatus === "COMPLETED" && totalUnbilledValue.greaterThan(ZERO)) {
    return {
      action: "Skapa slutfaktura",
      label: "Redo att fakturera",
      reason: "Projektet är klart och det finns ofakturerat underlag kvar.",
    };
  }

  if (daysSinceLastInvoice !== null && daysSinceLastInvoice > 14 && totalUnbilledValue.greaterThan(5000)) {
    return {
      action: "Skapa periodfaktura",
      label: "Periodfakturering rekommenderas",
      reason: "Det har gått mer än 14 dagar sedan senaste fakturan och nytt underlag finns.",
    };
  }

  if (totalUnbilledValue.greaterThan(10000)) {
    return {
      action: "Skapa faktura",
      label: "Redo att fakturera",
      reason: "Projektet har byggt upp ett tydligt fakturerbart värde.",
    };
  }

  if (invoiceCount > 0 && totalUnbilledValue.greaterThan(ZERO)) {
    return {
      action: "Delfakturera",
      label: "Delvis fakturerad",
      reason: "Projektet har både fakturerat och kvarvarande fakturerbart underlag.",
    };
  }

  return {
    action: "Ingen aktivitet",
    label: "Ingen aktivitet",
    reason: "Det finns ännu inte tillräckligt underlag för nästa fakturasteg.",
  };
}

type PreviewLine = {
  key: string;
  type: "TIME" | "MATERIAL";
  sourceType: "TIME" | "MATERIAL";
  sourceId: string;
  date: Date;
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  totalNet: Prisma.Decimal;
  totalVat: Prisma.Decimal;
  totalGross: Prisma.Decimal;
  sourceTimeEntryId?: string;
  sourceMaterialId?: string;
  sourceLabel: string;
  userName?: string | null;
  traceLabel: string;
  remainingQuantity: Prisma.Decimal;
};

function applyDraftOverrides(
  baseLines: PreviewLine[],
  draftLines: Array<z.infer<typeof invoiceDraftLineSchema>> | undefined,
  vatRate: Prisma.Decimal,
) {
  if (!draftLines?.length) {
    return baseLines;
  }

  const overrides = new Map(draftLines.map((line) => [line.key, line]));

  return baseLines
    .filter((line) => overrides.get(line.key)?.include ?? true)
    .map((line) => {
      const override = overrides.get(line.key);
      const quantity = override ? roundMoney(decimal(override.quantity)) : line.quantity;
      const unitPrice = override ? roundMoney(decimal(override.unitPrice)) : line.unitPrice;

      if (quantity.lte(ZERO)) {
        throw new Error("Fakturaradens antal måste vara större än noll.");
      }
      if (quantity.greaterThan(line.remainingQuantity)) {
        throw new Error(`Fakturaraden ${line.description} överstiger kvarvarande fakturerbar mängd.`);
      }

      const totals = buildLineTotals(quantity, unitPrice, vatRate);

      return {
        ...line,
        description: override?.description ?? line.description,
        quantity,
        unitPrice,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
      };
    });
}

async function buildInvoiceDraftPreviewInDb(
  projectId: string,
  options: DraftPreviewOptions,
  db: PrismaClientLike,
) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      companyId: options.companyId,
    },
    include: {
      customer: true,
      invoices: {
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          issueDate: true,
        },
        orderBy: {
          issueDate: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Projektet kunde inte hittas.");
  }

  const issueDate = options.issueDate ?? new Date();
  const fallbackTerms = project.customer?.invoiceTermsDays ?? 30;
  const dueDate =
    options.dueDate ??
    new Date(issueDate.getFullYear(), issueDate.getMonth(), issueDate.getDate() + fallbackTerms);
  const vatRate = decimal(options.vatRate ?? 25);
  const defaultHourlyRate =
    typeof options.defaultHourlyRate === "number" ? decimal(options.defaultHourlyRate) : null;

  const isPeriodic = options.invoiceMode === "PERIODIC";
  const isManual = options.invoiceMode === "MANUAL_PROGRESS";

  if (isPeriodic && (!options.billingPeriodStart || !options.billingPeriodEnd)) {
    throw new Error("Välj ett faktureringsintervall för periodfakturering.");
  }
  if (isManual && !options.selectedTimeEntryIds?.length && !options.selectedMaterialEntryIds?.length && !options.draftLines?.length) {
    throw new Error("Välj minst en tidrad eller materialrad för delfaktureringen.");
  }

  const [timeEntries, materialEntries] = await Promise.all([
    getProjectBillableTime(projectId, {
      companyId: options.companyId,
      billingPeriodStart: isPeriodic ? options.billingPeriodStart : null,
      billingPeriodEnd: isPeriodic ? options.billingPeriodEnd : null,
      selectedTimeEntryIds: isManual ? options.selectedTimeEntryIds : undefined,
      db,
    }),
    getProjectBillableMaterials(projectId, {
      companyId: options.companyId,
      billingPeriodStart: isPeriodic ? options.billingPeriodStart : null,
      billingPeriodEnd: isPeriodic ? options.billingPeriodEnd : null,
      selectedMaterialEntryIds: isManual ? options.selectedMaterialEntryIds : undefined,
      db,
    }),
  ]);

  const baseLines: PreviewLine[] = [];

  for (const entry of timeEntries) {
    const availableHours = getTimeEntryAvailableQuantity(entry);
    if (availableHours.lte(ZERO)) {
      continue;
    }

    const unitPrice = entry.hourlyRate ?? defaultHourlyRate ?? project.customer?.defaultHourlyRate ?? ZERO;
    const totals = buildLineTotals(availableHours, unitPrice, vatRate);
    baseLines.push({
      key: getLineKey("TIME", entry.id),
      type: "TIME",
      sourceType: "TIME",
      sourceId: entry.id,
      date: entry.date,
      description: `${entry.user.name} - ${entry.task?.title ?? "Projektarbete"} (${entry.date.toISOString().slice(0, 10)})`,
      quantity: availableHours,
      unitPrice,
      vatRate,
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      sourceTimeEntryId: entry.id,
      sourceLabel: entry.task?.title ?? "Projektarbete",
      userName: entry.user.name,
      traceLabel: `Tidrad ${entry.date.toISOString().slice(0, 10)} · ${entry.user.name}`,
      remainingQuantity: availableHours,
    });
  }

  for (const entry of materialEntries) {
    const remainingQuantity = getMaterialEntryAvailableQuantity(entry);
    if (remainingQuantity.lte(ZERO)) {
      continue;
    }

    const totals = buildLineTotals(remainingQuantity, entry.unitPrice, vatRate);
    baseLines.push({
      key: getLineKey("MATERIAL", entry.id),
      type: "MATERIAL",
      sourceType: "MATERIAL",
      sourceId: entry.id,
      date: entry.receiptDate ?? entry.createdAt,
      description: entry.description,
      quantity: remainingQuantity,
      unitPrice: entry.unitPrice,
      vatRate,
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
      totalGross: totals.totalGross,
      sourceMaterialId: entry.id,
      sourceLabel: entry.description,
      userName: entry.user.name,
      traceLabel: `Materialrad ${entry.description}`,
      remainingQuantity,
    });
  }

  const lines = applyDraftOverrides(baseLines, options.draftLines, vatRate);

  if (lines.length === 0) {
    throw new Error("Det finns inget fakturerbart underlag för det valda urvalet.");
  }

  const totals = lines.reduce(
    (sum, line) => ({
      totalNet: sum.totalNet.add(line.totalNet),
      totalVat: sum.totalVat.add(line.totalVat),
      totalGross: sum.totalGross.add(line.totalGross),
    }),
    { totalNet: ZERO, totalVat: ZERO, totalGross: ZERO },
  );

  const groupedLines = Object.values(
    lines.reduce<Record<string, { key: string; date: Date; type: "TIME" | "MATERIAL"; lines: PreviewLine[] }>>((groups, line) => {
      const groupKey = `${line.date.toISOString().slice(0, 10)}:${line.type}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          date: line.date,
          type: line.type,
          lines: [],
        };
      }
      groups[groupKey].lines.push(line);
      return groups;
    }, {}),
  ).sort((left, right) => left.date.getTime() - right.date.getTime());

  const customer =
    (options.customerId
      ? await db.customer.findFirst({
          where: {
            id: options.customerId,
            companyId: options.companyId,
          },
        })
      : null) ?? project.customer;

  const billingSummary = await getProjectBillingSummary(projectId, options.companyId);
  const suggestion = getProjectBillingSuggestion({
    projectStatus: project.status,
    totalUnbilledValue: billingSummary.totalUnbilledValue,
    lastInvoiceDate: billingSummary.lastInvoiceDate,
    invoiceCount: billingSummary.invoiceCount,
  });

  return {
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
    },
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          invoiceTermsDays: customer.invoiceTermsDays,
        }
      : null,
    customerName: customer?.name ?? project.customerName,
    invoiceMode: options.invoiceMode,
    invoiceModeLabel: invoiceModeLabels[options.invoiceMode],
    billingPeriodStart: options.billingPeriodStart ?? null,
    billingPeriodEnd: options.billingPeriodEnd ?? null,
    issueDate,
    dueDate,
    invoiceNumber: await generateInvoiceNumber(options.companyId, db, issueDate),
    lines,
    groupedLines,
    totalNet: roundMoney(totals.totalNet),
    totalVat: roundMoney(totals.totalVat),
    totalGross: roundMoney(totals.totalGross),
    sourceCounts: {
      timeEntries: timeEntries.length,
      materialEntries: materialEntries.length,
    },
    suggestion,
  };
}

export async function buildInvoiceDraftPreview(projectId: string, options: DraftPreviewOptions) {
  return buildInvoiceDraftPreviewInDb(projectId, options, prisma);
}

export async function createInvoiceFromDraftPreview(projectId: string, options: DraftPreviewOptions) {
  return prisma.$transaction(async (tx) => {
    const preview = await buildInvoiceDraftPreviewInDb(projectId, options, tx);

    const invoice = await tx.invoice.create({
      data: {
        companyId: options.companyId,
        projectId,
        customerId: preview.customer?.id ?? null,
        customerName: preview.customerName,
        invoiceMode: options.invoiceMode,
        status: "DRAFT",
        invoiceNumber: preview.invoiceNumber,
        issueDate: preview.issueDate,
        dueDate: preview.dueDate,
        billingPeriodStart: preview.billingPeriodStart,
        billingPeriodEnd: preview.billingPeriodEnd,
        totalNet: preview.totalNet,
        totalVat: preview.totalVat,
        totalGross: preview.totalGross,
        lines: {
          create: preview.lines.map((line) => ({
            companyId: options.companyId,
            type: line.type,
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            totalNet: line.totalNet,
            totalVat: line.totalVat,
            totalGross: line.totalGross,
            sourceTimeEntryId: line.sourceTimeEntryId ?? null,
            sourceMaterialId: line.sourceMaterialId ?? null,
          })),
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
      },
    });

    for (const line of preview.lines) {
      if (line.sourceType === "TIME" && line.sourceTimeEntryId) {
        const entry = await tx.timeEntry.findUniqueOrThrow({
          where: { id: line.sourceTimeEntryId },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            invoicedQuantity: true,
            invoicedAmount: true,
          },
        });
        const nextInvoicedQuantity = roundMoney(decimal(entry.invoicedQuantity).add(line.quantity));
        const nextInvoicedAmount = roundMoney(decimal(entry.invoicedAmount).add(line.totalNet));
        const fullyInvoiced = nextInvoicedQuantity.greaterThanOrEqualTo(getWorkedHours(entry));

        await tx.timeEntry.update({
          where: { id: entry.id },
          data: {
            invoicedQuantity: nextInvoicedQuantity,
            invoicedAmount: nextInvoicedAmount,
            invoiced: fullyInvoiced,
          },
        });
      }

      if (line.sourceType === "MATERIAL" && line.sourceMaterialId) {
        const entry = await tx.materialEntry.findUniqueOrThrow({
          where: { id: line.sourceMaterialId },
          select: {
            id: true,
            quantity: true,
            invoicedQuantity: true,
            invoicedAmount: true,
          },
        });
        const nextInvoicedQuantity = roundMoney(decimal(entry.invoicedQuantity).add(line.quantity));
        const nextInvoicedAmount = roundMoney(decimal(entry.invoicedAmount).add(line.totalNet));
        const fullyInvoiced = nextInvoicedQuantity.greaterThanOrEqualTo(decimal(entry.quantity));

        await tx.materialEntry.update({
          where: { id: entry.id },
          data: {
            invoicedQuantity: nextInvoicedQuantity,
            invoicedAmount: nextInvoicedAmount,
            invoiced: fullyInvoiced,
          },
        });
      }
    }

    return invoice;
  });
}
