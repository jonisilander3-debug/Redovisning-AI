import bcrypt from "bcryptjs";
import {
  BackofficeCasePackCategory,
  BackofficeCasePackChecklistItemStatus,
  BackofficeCasePackChecklistItemType,
  BackofficeCasePackStatus,
  BackofficeDocumentCategory,
  BackofficeDocumentStatus,
  BackofficeFollowUpCategory,
  BackofficeFollowUpPriority,
  BackofficeFollowUpStatus,
  BackofficeLinkedEntityType,
  BackofficeRole,
  BankFileExportProfile,
  CompanyAdoptionFollowUpOutcomeStatus,
  CompanyAdoptionFollowUpPriority,
  CompanyAdoptionFollowUpReviewStatus,
  CompanyAdoptionFollowUpStatus,
  CompanyType,
  CustomerPaymentSource,
  CustomerPaymentStatus,
  InvoiceMode,
  InvoiceStatus,
  JournalEntrySourceType,
  JournalEntryStatus,
  LegalForm,
  PayrollRunStatus,
  Prisma,
  PrismaClient,
  ProjectCommercialBasisType,
  ProjectKickoffStatus,
  ProjectStatus,
  SalaryType,
  TaskPriority,
  TaskStatus,
  UserRole,
  UserStatus,
  VatReportStatus,
  WorkingPaperCategory,
  WorkingPaperStatus,
} from "@prisma/client";

export const prisma = new PrismaClient();
export const DEMO_PASSWORD = "Demo123!";

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

const BAS_DEFAULT_ACCOUNTS = [
  ["1510", "Kundfordringar", "ASSET", null],
  ["1930", "Foretagskonto", "ASSET", null],
  ["3001", "Forsaljning tjanster, 25% moms", "REVENUE", "OUTPUT_25"],
  ["4010", "Inkop material och varor", "EXPENSE", "INPUT_STANDARD"],
  ["5010", "Lokalhyra", "EXPENSE", null],
  ["5410", "Forbrukningsinventarier", "EXPENSE", null],
  ["2611", "Utgaende moms 25%", "LIABILITY", "OUTPUT_25"],
  ["2641", "Ingaende moms", "ASSET", "INPUT_STANDARD"],
  ["2650", "Redovisningskonto for moms", "LIABILITY", null],
  ["7010", "Loner till tjansteman", "EXPENSE", null],
  ["7510", "Arbetsgivaravgifter", "EXPENSE", null],
  ["2710", "Personalskatt", "LIABILITY", null],
  ["2910", "Upplupna loner", "LIABILITY", null],
  ["2920", "Upplupna semesterloner", "LIABILITY", null],
  ["2990", "Ovriga upplupna kostnader", "LIABILITY", null],
  ["1790", "Ovriga forutbetalda kostnader", "ASSET", null],
  ["6351", "Konstaterade kundforluster", "EXPENSE", null],
  ["2121", "Periodiseringsfond", "EQUITY", null],
  ["8811", "Avsattning till periodiseringsfond", "EXPENSE", null],
  ["8910", "Skatt pa arets resultat", "EXPENSE", null],
  ["2510", "Skatteskulder", "LIABILITY", null],
] as const;

export function decimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  if (value === null || typeof value === "undefined") {
    return ZERO;
  }
  return new Prisma.Decimal(value);
}

export function roundMoney(value: number | string | Prisma.Decimal) {
  return decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculateTotals(
  quantity: number | string | Prisma.Decimal,
  unitPrice: number | string | Prisma.Decimal,
  vatRate = 25,
) {
  const qty = decimal(quantity);
  const price = decimal(unitPrice);
  const rate = decimal(vatRate);
  const totalNet = roundMoney(qty.mul(price));
  const totalVat = roundMoney(totalNet.mul(rate).div(HUNDRED));
  const totalGross = roundMoney(totalNet.add(totalVat));
  return { totalNet, totalVat, totalGross, vatRate: rate };
}

export function addDays(base: Date, offset: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return date;
}

export function atTime(base: Date, hours: number, minutes = 0) {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function startOfDay(base: Date) {
  const date = new Date(base);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(base: Date) {
  const date = new Date(base);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildInvoiceNumber(year: number, sequence: number) {
  return `${year}-${String(sequence).padStart(4, "0")}`;
}

export function buildQuoteNumber(year: number, sequence: number) {
  return `${year}-OFF-${String(sequence).padStart(4, "0")}`;
}

export async function hashPassword(password = DEMO_PASSWORD) {
  return bcrypt.hash(password, 12);
}

export async function resetDatabase() {
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = OFF");
  const tables = (await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  ))
    .map((row) => row.name)
    .filter((name) => name !== "_prisma_migrations");

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }

  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");
}

export async function seedDefaultAccounts(companyId: string) {
  for (const [number, name, type, vatCode] of BAS_DEFAULT_ACCOUNTS) {
    await prisma.account.upsert({
      where: {
        companyId_number: {
          companyId,
          number,
        },
      },
      update: {
        name,
        type,
        vatCode,
        isDefault: true,
      },
      create: {
        companyId,
        number,
        name,
        type,
        vatCode,
        isDefault: true,
      },
    });
  }
}

export async function getAccountMap(companyId: string) {
  const accounts = await prisma.account.findMany({
    where: { companyId },
  });
  return new Map(accounts.map((account) => [account.number, account]));
}

export async function createCompany(input: {
  name: string;
  slug?: string;
  organizationNumber: string;
  groupId?: string | null;
  parentCompanyId?: string | null;
  legalForm?: LegalForm;
  companyType?: CompanyType;
  isHoldingCompany?: boolean;
  bankExportProfile?: BankFileExportProfile;
  starterSetupNote?: string | null;
  bankIban?: string | null;
  bankBic?: string | null;
}) {
  const company = await prisma.company.create({
    data: {
      name: input.name,
      slug: input.slug ?? slugify(input.name),
      organizationNumber: input.organizationNumber,
      groupId: input.groupId ?? null,
      parentCompanyId: input.parentCompanyId ?? null,
      legalForm: input.legalForm ?? "LIMITED_COMPANY",
      companyType: input.companyType ?? "OPERATING",
      isHoldingCompany: input.isHoldingCompany ?? false,
      bankExportProfile: input.bankExportProfile ?? "PAIN_001",
      starterSetupNote: input.starterSetupNote ?? null,
      bankIban: input.bankIban ?? null,
      bankBic: input.bankBic ?? null,
    },
  });

  await seedDefaultAccounts(company.id);
  return company;
}

export async function createUserWithMemberships(input: {
  email: string;
  name: string;
  companyId: string;
  role: UserRole;
  status?: UserStatus;
  salaryType?: SalaryType;
  hourlyRate?: number | null;
  monthlySalary?: number | null;
  taxPercent?: number | null;
  employerContributionRate?: number | null;
  memberships?: Array<{ companyId: string; role: UserRole }>;
  backofficeRoles?: BackofficeRole[];
  bankIban?: string | null;
}) {
  const passwordHash = await hashPassword();
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      companyId: input.companyId,
      role: input.role,
      status: input.status ?? "ACTIVE",
      salaryType: input.salaryType ?? "HOURLY",
      hourlyRate:
        typeof input.hourlyRate === "number" ? roundMoney(input.hourlyRate) : null,
      monthlySalary:
        typeof input.monthlySalary === "number" ? roundMoney(input.monthlySalary) : null,
      taxPercent:
        typeof input.taxPercent === "number" ? roundMoney(input.taxPercent) : roundMoney(30),
      employerContributionRate:
        typeof input.employerContributionRate === "number"
          ? roundMoney(input.employerContributionRate)
          : roundMoney(31.42),
      bankIban: input.bankIban ?? null,
    },
  });

  const memberships = input.memberships ?? [{ companyId: input.companyId, role: input.role }];
  for (const membership of memberships) {
    await prisma.companyMembership.upsert({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: membership.companyId,
        },
      },
      update: {
        role: membership.role,
      },
      create: {
        userId: user.id,
        companyId: membership.companyId,
        role: membership.role,
      },
    });
  }

  for (const accessRole of input.backofficeRoles ?? []) {
    await prisma.backofficeAccess.create({
      data: {
        userId: user.id,
        role: accessRole,
      },
    });
  }

  return user;
}

export async function createManualJournalEntry(input: {
  companyId: string;
  date: Date;
  description: string;
  sourceType?: JournalEntrySourceType;
  sourceId?: string | null;
  status?: JournalEntryStatus;
  lines: Array<{
    accountId: string;
    debit?: number | string | Prisma.Decimal;
    credit?: number | string | Prisma.Decimal;
    vatRate?: number | string | Prisma.Decimal | null;
    vatAmount?: number | string | Prisma.Decimal | null;
    description?: string | null;
  }>;
}) {
  const debit = input.lines.reduce((sum, line) => sum.add(decimal(line.debit ?? 0)), ZERO);
  const credit = input.lines.reduce((sum, line) => sum.add(decimal(line.credit ?? 0)), ZERO);

  if (!debit.equals(credit)) {
    throw new Error(`Journal entry "${input.description}" is not balanced.`);
  }

  return prisma.journalEntry.create({
    data: {
      companyId: input.companyId,
      date: input.date,
      description: input.description,
      sourceType: input.sourceType ?? "MANUAL",
      sourceId: input.sourceId ?? null,
      status: input.status ?? "POSTED",
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: roundMoney(line.debit ?? 0),
          credit: roundMoney(line.credit ?? 0),
          vatRate:
            typeof line.vatRate === "undefined" || line.vatRate === null
              ? null
              : roundMoney(line.vatRate),
          vatAmount:
            typeof line.vatAmount === "undefined" || line.vatAmount === null
              ? null
              : roundMoney(line.vatAmount),
          description: line.description ?? null,
        })),
      },
    },
    include: {
      lines: true,
    },
  });
}

export async function createInvoiceJournalEntry(input: {
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: Date;
  totalNet: Prisma.Decimal;
  totalVat: Prisma.Decimal;
  totalGross: Prisma.Decimal;
}) {
  const accountMap = await getAccountMap(input.companyId);
  return createManualJournalEntry({
    companyId: input.companyId,
    date: input.issueDate,
    description: `Faktura ${input.invoiceNumber} - ${input.customerName}`,
    sourceType: "INVOICE",
    sourceId: input.invoiceId,
    status: "POSTED",
    lines: [
      {
        accountId: accountMap.get("1510")!.id,
        debit: input.totalGross,
        credit: ZERO,
        description: "Kundfordran",
      },
      {
        accountId: accountMap.get("3001")!.id,
        debit: ZERO,
        credit: input.totalNet,
        vatRate: 25,
        description: "Tjansteintakt",
      },
      {
        accountId: accountMap.get("2611")!.id,
        debit: ZERO,
        credit: input.totalVat,
        vatRate: 25,
        vatAmount: input.totalVat,
        description: "Utgaende moms",
      },
    ],
  });
}

export async function createCustomerPaymentJournalEntry(input: {
  companyId: string;
  paymentId: string;
  invoiceNumber: string;
  customerName: string;
  date: Date;
  amount: Prisma.Decimal;
  reference?: string | null;
}) {
  const accountMap = await getAccountMap(input.companyId);
  return createManualJournalEntry({
    companyId: input.companyId,
    date: input.date,
    description: `Kundbetalning ${input.invoiceNumber} - ${input.customerName}`,
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: input.paymentId,
    status: "POSTED",
    lines: [
      {
        accountId: accountMap.get("1930")!.id,
        debit: input.amount,
        credit: ZERO,
        description: input.reference ?? "Inbetalning",
      },
      {
        accountId: accountMap.get("1510")!.id,
        debit: ZERO,
        credit: input.amount,
        description: "Reglering kundfordran",
      },
    ],
  });
}

export async function createMaterialJournalEntry(input: {
  companyId: string;
  materialEntryId: string;
  date: Date;
  description: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  supplierName?: string | null;
}) {
  const accountMap = await getAccountMap(input.companyId);
  const totalNet = roundMoney(input.quantity.mul(input.unitCost));
  const totalVat = roundMoney(totalNet.mul(input.vatRate).div(HUNDRED));
  const totalGross = roundMoney(totalNet.add(totalVat));

  return createManualJournalEntry({
    companyId: input.companyId,
    date: input.date,
    description: `Materialinkop - ${input.description}`,
    sourceType: "MATERIAL",
    sourceId: input.materialEntryId,
    status: "POSTED",
    lines: [
      {
        accountId: accountMap.get("4010")!.id,
        debit: totalNet,
        credit: ZERO,
        description: input.description,
      },
      {
        accountId: accountMap.get("2641")!.id,
        debit: totalVat,
        credit: ZERO,
        vatRate: input.vatRate,
        vatAmount: totalVat,
        description: "Ingaende moms",
      },
      {
        accountId: accountMap.get("1930")!.id,
        debit: ZERO,
        credit: totalGross,
        description: input.supplierName ?? input.description,
      },
    ],
  });
}

export async function createPayrollJournalEntry(input: {
  companyId: string;
  payrollRunId: string;
  title: string;
  date: Date;
  totalGross: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalEmployerContribution: Prisma.Decimal;
  totalNet: Prisma.Decimal;
}) {
  const accountMap = await getAccountMap(input.companyId);
  return createManualJournalEntry({
    companyId: input.companyId,
    date: input.date,
    description: `Lonekorning - ${input.title}`,
    sourceType: "PAYROLL",
    sourceId: input.payrollRunId,
    status: "POSTED",
    lines: [
      {
        accountId: accountMap.get("7010")!.id,
        debit: input.totalGross,
        credit: ZERO,
        description: "Bruttoloner",
      },
      {
        accountId: accountMap.get("7510")!.id,
        debit: input.totalEmployerContribution,
        credit: ZERO,
        description: "Arbetsgivaravgifter",
      },
      {
        accountId: accountMap.get("2710")!.id,
        debit: ZERO,
        credit: input.totalTax,
        description: "Avdragen skatt",
      },
      {
        accountId: accountMap.get("2910")!.id,
        debit: ZERO,
        credit: roundMoney(input.totalNet.add(input.totalEmployerContribution)),
        description: "Skuld till lon och avgifter",
      },
    ],
  });
}

export type InvoiceSeedLine =
  | {
      type: "TIME";
      entryId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
    }
  | {
      type: "MATERIAL";
      entryId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
    }
  | {
      type: "MANUAL";
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate?: number;
    };

export async function createInvoiceWithLines(input: {
  companyId: string;
  projectId?: string | null;
  customerId?: string | null;
  customerName: string;
  invoiceNumber: string;
  invoiceMode?: InvoiceMode;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
  lines: InvoiceSeedLine[];
  isCreditNote?: boolean;
}) {
  let totalNet = ZERO;
  let totalVat = ZERO;
  let totalGross = ZERO;

  const lines = input.lines.map((line) => {
    const totals = calculateTotals(line.quantity, line.unitPrice, line.vatRate ?? 25);
    totalNet = totalNet.add(totals.totalNet);
    totalVat = totalVat.add(totals.totalVat);
    totalGross = totalGross.add(totals.totalGross);
    return {
      ...line,
      ...totals,
    };
  });

  const invoice = await prisma.invoice.create({
    data: {
      companyId: input.companyId,
      projectId: input.projectId ?? null,
      customerId: input.customerId ?? null,
      customerName: input.customerName,
      invoiceMode: input.invoiceMode ?? "PROJECT_FINAL",
      status: input.status,
      invoiceNumber: input.invoiceNumber,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      billingPeriodStart: input.billingPeriodStart ?? null,
      billingPeriodEnd: input.billingPeriodEnd ?? null,
      totalNet: roundMoney(totalNet),
      totalVat: roundMoney(totalVat),
      totalGross: roundMoney(totalGross),
      isCreditNote: input.isCreditNote ?? false,
      lines: {
        create: lines.map((line) => ({
          companyId: input.companyId,
          type: line.type === "MANUAL" ? "MANUAL" : line.type,
          sourceType:
            line.type === "MANUAL"
              ? null
              : (line.type as "TIME" | "MATERIAL"),
          sourceId: line.type === "MANUAL" ? null : line.entryId,
          description: line.description,
          quantity: roundMoney(line.quantity),
          unitPrice: roundMoney(line.unitPrice),
          vatRate: line.vatRate,
          totalNet: line.totalNet,
          totalVat: line.totalVat,
          totalGross: line.totalGross,
          sourceTimeEntryId: line.type === "TIME" ? line.entryId : null,
          sourceMaterialId: line.type === "MATERIAL" ? line.entryId : null,
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  for (const line of lines) {
    if (line.type === "TIME") {
      const entry = await prisma.timeEntry.findUniqueOrThrow({
        where: { id: line.entryId },
        select: {
          id: true,
          invoicedQuantity: true,
          invoicedAmount: true,
          startTime: true,
          endTime: true,
        },
      });
      const durationHours = roundMoney(
        decimal(
          Math.max(0, ((entry.endTime ?? entry.startTime).getTime() - entry.startTime.getTime()) / 3600000),
        ),
      );
      const nextQuantity = roundMoney(decimal(entry.invoicedQuantity).add(line.quantity));
      await prisma.timeEntry.update({
        where: { id: line.entryId },
        data: {
          invoicedQuantity: nextQuantity,
          invoicedAmount: roundMoney(decimal(entry.invoicedAmount).add(line.totalNet)),
          invoiced: nextQuantity.greaterThanOrEqualTo(durationHours),
        },
      });
    }

    if (line.type === "MATERIAL") {
      const entry = await prisma.materialEntry.findUniqueOrThrow({
        where: { id: line.entryId },
        select: {
          id: true,
          quantity: true,
          invoicedQuantity: true,
          invoicedAmount: true,
        },
      });
      const nextQuantity = roundMoney(decimal(entry.invoicedQuantity).add(line.quantity));
      await prisma.materialEntry.update({
        where: { id: line.entryId },
        data: {
          invoicedQuantity: nextQuantity,
          invoicedAmount: roundMoney(decimal(entry.invoicedAmount).add(line.totalNet)),
          invoiced: nextQuantity.greaterThanOrEqualTo(entry.quantity),
        },
      });
    }
  }

  if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
    await createInvoiceJournalEntry({
      companyId: input.companyId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      issueDate: invoice.issueDate,
      totalNet: invoice.totalNet,
      totalVat: invoice.totalVat,
      totalGross: invoice.totalGross,
    });
  }

  return invoice;
}

export async function registerInvoicePayment(input: {
  companyId: string;
  invoiceId: string;
  amount: number;
  date: Date;
  reference?: string | null;
  status?: CustomerPaymentStatus;
  source?: CustomerPaymentSource;
}) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: input.invoiceId },
  });
  const paymentAmount = roundMoney(input.amount);
  const nextPaidAmount = roundMoney(decimal(invoice.paidAmount).add(paymentAmount));
  const remaining = roundMoney(invoice.totalGross.sub(nextPaidAmount).sub(invoice.writtenOffAmount));
  const nextStatus: InvoiceStatus =
    remaining.lte(ZERO) ? "PAID" : nextPaidAmount.greaterThan(ZERO) ? "PARTIALLY_PAID" : invoice.status;

  const payment = await prisma.customerPayment.create({
    data: {
      companyId: input.companyId,
      invoiceId: invoice.id,
      date: input.date,
      amount: paymentAmount,
      reference: input.reference ?? null,
      source: input.source ?? "MANUAL",
      status: input.status ?? (nextStatus === "PAID" ? "MATCHED" : "PARTIAL"),
    },
  });

  const journalEntry = await createCustomerPaymentJournalEntry({
    companyId: input.companyId,
    paymentId: payment.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    date: input.date,
    amount: paymentAmount,
    reference: input.reference ?? null,
  });

  await prisma.customerPayment.update({
    where: { id: payment.id },
    data: {
      journalEntryId: journalEntry.id,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: nextPaidAmount,
      paymentDate: nextStatus === "PAID" ? input.date : invoice.paymentDate,
      paymentReference: input.reference ?? invoice.paymentReference,
      status: nextStatus,
    },
  });

  return payment;
}

export async function createVatReportRun(input: {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  status: VatReportStatus;
  outputVat25: number;
  inputVat: number;
  linkedJournalEntryIds?: string[];
  filedAt?: Date | null;
}) {
  return prisma.vatReportRun.create({
    data: {
      companyId: input.companyId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: input.status,
      outputVat25: roundMoney(input.outputVat25),
      inputVat: roundMoney(input.inputVat),
      netVatPayable: roundMoney(decimal(input.outputVat25).sub(decimal(input.inputVat))),
      journalEntryCount: input.linkedJournalEntryIds?.length ?? 0,
      filedAt: input.filedAt ?? null,
      lockedAt: input.status === "FILED" ? input.filedAt ?? input.periodEnd : null,
      journalEntries: input.linkedJournalEntryIds?.length
        ? {
            create: input.linkedJournalEntryIds.map((journalEntryId) => ({
              journalEntryId,
            })),
          }
        : undefined,
    },
  });
}

export async function createEmployerDeclarationRun(input: {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  status: "DRAFT" | "READY" | "SUBMITTED";
  payrollRuns: Array<{
    payrollRunId: string;
    userId: string;
    payrollLineId: string;
    grossSalary: number | Prisma.Decimal;
    taxAmount: number | Prisma.Decimal;
    employerContribution: number | Prisma.Decimal;
    benefitsAmount?: number | Prisma.Decimal;
    absenceAdjustmentAmount?: number | Prisma.Decimal;
  }>;
}) {
  const uniquePayrollRunIds = Array.from(
    new Set(input.payrollRuns.map((line) => line.payrollRunId)),
  );
  const totals = input.payrollRuns.reduce(
    (acc, line) => ({
      gross: acc.gross.add(decimal(line.grossSalary)),
      tax: acc.tax.add(decimal(line.taxAmount)),
      employer: acc.employer.add(decimal(line.employerContribution)),
    }),
    { gross: ZERO, tax: ZERO, employer: ZERO },
  );

  return prisma.employerDeclarationRun.create({
    data: {
      companyId: input.companyId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: input.status,
      totalGrossSalary: roundMoney(totals.gross),
      totalTax: roundMoney(totals.tax),
      totalEmployerContribution: roundMoney(totals.employer),
      submittedAt: input.status === "SUBMITTED" ? input.periodEnd : null,
      lines: {
        create: input.payrollRuns.map((line) => ({
          companyId: input.companyId,
          payrollLineId: line.payrollLineId,
          userId: line.userId,
          grossSalary: roundMoney(line.grossSalary),
          taxAmount: roundMoney(line.taxAmount),
          employerContribution: roundMoney(line.employerContribution),
          benefitsAmount: roundMoney(line.benefitsAmount ?? 0),
          absenceAdjustmentAmount: roundMoney(line.absenceAdjustmentAmount ?? 0),
        })),
      },
      payrollRuns: {
        create: uniquePayrollRunIds.map((payrollRunId) => ({
          payrollRunId,
        })),
      },
    },
  });
}

export async function createAdoptionFollowUp(input: {
  companyId: string;
  ownerId?: string | null;
  title: string;
  description?: string | null;
  priority?: CompanyAdoptionFollowUpPriority;
  status?: CompanyAdoptionFollowUpStatus;
  dueDate?: Date | null;
  reviewStatus?: CompanyAdoptionFollowUpReviewStatus;
  reviewByDate?: Date | null;
  lastReviewedAt?: Date | null;
  lastReviewedByUserId?: string | null;
  reviewNote?: string | null;
  outcomeStatus?: CompanyAdoptionFollowUpOutcomeStatus;
  outcomeSummary?: string | null;
  outcomeRecordedAt?: Date | null;
  outcomeRecordedByUserId?: string | null;
}) {
  return prisma.companyAdoptionFollowUp.create({
    data: {
      companyId: input.companyId,
      ownerId: input.ownerId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "MEDIUM",
      status: input.status ?? "OPEN",
      dueDate: input.dueDate ?? null,
      reviewStatus: input.reviewStatus ?? "NOT_REVIEWED",
      reviewByDate: input.reviewByDate ?? null,
      lastReviewedAt: input.lastReviewedAt ?? null,
      lastReviewedByUserId: input.lastReviewedByUserId ?? null,
      reviewNote: input.reviewNote ?? null,
      outcomeStatus: input.outcomeStatus ?? "UNVERIFIED",
      outcomeSummary: input.outcomeSummary ?? null,
      outcomeRecordedAt: input.outcomeRecordedAt ?? null,
      outcomeRecordedByUserId: input.outcomeRecordedByUserId ?? null,
      completedAt:
        input.status === "DONE"
          ? input.outcomeRecordedAt ?? input.lastReviewedAt ?? new Date()
          : null,
    },
  });
}

export async function createBackofficeFollowUp(input: {
  companyId?: string | null;
  assignedToUserId?: string | null;
  createdByUserId: string;
  category: BackofficeFollowUpCategory;
  title: string;
  description?: string | null;
  status?: BackofficeFollowUpStatus;
  priority?: BackofficeFollowUpPriority;
  dueDate?: Date | null;
}) {
  return prisma.backofficeFollowUp.create({
    data: {
      companyId: input.companyId ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      createdByUserId: input.createdByUserId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "OPEN",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ?? null,
      completedAt: input.status === "DONE" ? new Date() : null,
    },
  });
}

export async function createBackofficeDocument(input: {
  companyId: string;
  uploadedByUserId?: string | null;
  category: BackofficeDocumentCategory;
  subcategory?: string | null;
  title: string;
  description?: string | null;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  documentDate?: Date | null;
  status?: BackofficeDocumentStatus;
  linkedEntityType?: BackofficeLinkedEntityType | null;
  linkedEntityId?: string | null;
  verifiedByUserId?: string | null;
  verifiedAt?: Date | null;
}) {
  return prisma.backofficeDocument.create({
    data: {
      companyId: input.companyId,
      uploadedByUserId: input.uploadedByUserId ?? null,
      category: input.category,
      subcategory: input.subcategory ?? null,
      title: input.title,
      description: input.description ?? null,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType ?? "application/pdf",
      documentDate: input.documentDate ?? null,
      status: input.status ?? "RECEIVED",
      linkedEntityType: input.linkedEntityType ?? null,
      linkedEntityId: input.linkedEntityId ?? null,
      verifiedByUserId: input.verifiedByUserId ?? null,
      verifiedAt: input.verifiedAt ?? null,
    },
  });
}

export async function createWorkingPaper(input: {
  companyId: string;
  category: WorkingPaperCategory;
  title: string;
  description?: string | null;
  status?: WorkingPaperStatus;
  assignedToUserId?: string | null;
  relatedDocumentId?: string | null;
  linkedEntityType?: BackofficeLinkedEntityType | null;
  linkedEntityId?: string | null;
}) {
  return prisma.workingPaper.create({
    data: {
      companyId: input.companyId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "OPEN",
      assignedToUserId: input.assignedToUserId ?? null,
      relatedDocumentId: input.relatedDocumentId ?? null,
      linkedEntityType: input.linkedEntityType ?? null,
      linkedEntityId: input.linkedEntityId ?? null,
    },
  });
}

export async function createBackofficeNote(input: {
  userId: string;
  content: string;
  documentId?: string | null;
  workingPaperId?: string | null;
  casePackId?: string | null;
}) {
  return prisma.backofficeNote.create({
    data: {
      userId: input.userId,
      content: input.content,
      documentId: input.documentId ?? null,
      workingPaperId: input.workingPaperId ?? null,
      casePackId: input.casePackId ?? null,
    },
  });
}

export async function createCasePack(input: {
  companyId: string;
  category: BackofficeCasePackCategory;
  title: string;
  description?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  status?: BackofficeCasePackStatus;
  assignedToUserId?: string | null;
  createdByUserId?: string | null;
  documentIds?: string[];
  workingPaperIds?: string[];
  entityLinks?: Array<{ linkedEntityType: BackofficeLinkedEntityType; linkedEntityId: string }>;
  notes?: Array<{ userId: string; content: string }>;
  checklistItems?: Array<{
    category?: BackofficeCasePackCategory;
    title: string;
    description?: string | null;
    itemType: BackofficeCasePackChecklistItemType;
    status?: BackofficeCasePackChecklistItemStatus;
    sortOrder?: number | null;
    assignedToUserId?: string | null;
    completedByUserId?: string | null;
    completedAt?: Date | null;
    requiredDocumentCategory?: BackofficeDocumentCategory | null;
    requiredVerifiedDocument?: boolean;
    comments?: Array<{ userId: string; content: string }>;
  }>;
}) {
  return prisma.backofficeCasePack.create({
    data: {
      companyId: input.companyId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      status: input.status ?? "OPEN",
      assignedToUserId: input.assignedToUserId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      finalizedAt: input.status === "FINAL" ? input.periodEnd ?? new Date() : null,
      documents: input.documentIds?.length
        ? {
            create: input.documentIds.map((documentId) => ({ documentId })),
          }
        : undefined,
      workingPapers: input.workingPaperIds?.length
        ? {
            create: input.workingPaperIds.map((workingPaperId) => ({ workingPaperId })),
          }
        : undefined,
      entityLinks: input.entityLinks?.length
        ? {
            create: input.entityLinks.map((link) => ({
              linkedEntityType: link.linkedEntityType,
              linkedEntityId: link.linkedEntityId,
            })),
          }
        : undefined,
      checklistItems: input.checklistItems?.length
        ? {
            create: input.checklistItems.map((item) => ({
              category: item.category ?? input.category,
              title: item.title,
              description: item.description ?? null,
              itemType: item.itemType,
              status: item.status ?? "OPEN",
              sortOrder: item.sortOrder ?? null,
              assignedToUserId: item.assignedToUserId ?? null,
              completedByUserId: item.completedByUserId ?? null,
              completedAt: item.completedAt ?? null,
              requiredDocumentCategory: item.requiredDocumentCategory ?? null,
              requiredVerifiedDocument: item.requiredVerifiedDocument ?? false,
              comments: item.comments?.length
                ? {
                    create: item.comments.map((comment) => ({
                      userId: comment.userId,
                      content: comment.content,
                    })),
                  }
                : undefined,
            })),
          }
        : undefined,
      notes: input.notes?.length
        ? {
            create: input.notes.map((note) => ({
              userId: note.userId,
              content: note.content,
            })),
          }
        : undefined,
    },
  });
}

export async function logSeedSummary(title: string) {
  const [
    companyCount,
    userCount,
    customerCount,
    projectCount,
    timeEntryCount,
    invoiceCount,
    journalEntryCount,
    payrollRunCount,
    casePackCount,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.timeEntry.count(),
    prisma.invoice.count(),
    prisma.journalEntry.count(),
    prisma.payrollRun.count(),
    prisma.backofficeCasePack.count(),
  ]);

  console.log(
    `${title}: ${companyCount} companies, ${userCount} users, ${customerCount} customers, ${projectCount} projects, ${timeEntryCount} time entries, ${invoiceCount} invoices, ${journalEntryCount} journal entries, ${payrollRunCount} payroll runs, ${casePackCount} case packs`,
  );
}

export {
  BackofficeCasePackCategory,
  BackofficeCasePackChecklistItemStatus,
  BackofficeCasePackChecklistItemType,
  BackofficeCasePackStatus,
  BackofficeDocumentCategory,
  BackofficeDocumentStatus,
  BackofficeFollowUpCategory,
  BackofficeFollowUpPriority,
  BackofficeFollowUpStatus,
  BackofficeLinkedEntityType,
  BackofficeRole,
  BankFileExportProfile,
  CompanyAdoptionFollowUpOutcomeStatus,
  CompanyAdoptionFollowUpPriority,
  CompanyAdoptionFollowUpReviewStatus,
  CompanyAdoptionFollowUpStatus,
  CompanyType,
  CustomerPaymentSource,
  CustomerPaymentStatus,
  InvoiceMode,
  InvoiceStatus,
  JournalEntrySourceType,
  LegalForm,
  PayrollRunStatus,
  ProjectCommercialBasisType,
  ProjectKickoffStatus,
  ProjectStatus,
  SalaryType,
  TaskPriority,
  TaskStatus,
  UserRole,
  UserStatus,
  VatReportStatus,
  WorkingPaperCategory,
  WorkingPaperStatus,
};
