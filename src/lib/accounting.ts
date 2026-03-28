import {
  AccountType,
  JournalEntrySourceType,
  JournalEntryStatus,
  Prisma,
} from "@prisma/client";
import { assertAccountingPeriodOpen } from "@/lib/accounting-periods";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/invoicing";

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

const BAS_DEFAULT_ACCOUNTS: Array<{
  number: string;
  name: string;
  type: AccountType;
  vatCode?: string;
}> = [
  { number: "1510", name: "Kundfordringar", type: "ASSET" },
  { number: "1930", name: "Foretagskonto", type: "ASSET" },
  { number: "3001", name: "Forsaljning tjanster, 25% moms", type: "REVENUE", vatCode: "OUTPUT_25" },
  { number: "4010", name: "Inkop material och varor", type: "EXPENSE", vatCode: "INPUT_STANDARD" },
  { number: "5010", name: "Lokalhyra", type: "EXPENSE" },
  { number: "5410", name: "Forbrukningsinventarier", type: "EXPENSE" },
  { number: "2611", name: "Utgaende moms 25%", type: "LIABILITY", vatCode: "OUTPUT_25" },
  { number: "2641", name: "Ingaende moms", type: "ASSET", vatCode: "INPUT_STANDARD" },
  { number: "2650", name: "Redovisningskonto for moms", type: "LIABILITY" },
  { number: "7010", name: "Loner till tjansteman", type: "EXPENSE" },
  { number: "7510", name: "Arbetsgivaravgifter", type: "EXPENSE" },
  { number: "2710", name: "Personalskatt", type: "LIABILITY" },
  { number: "2910", name: "Upplupna loner", type: "LIABILITY" },
  { number: "2920", name: "Upplupna semesterloner", type: "LIABILITY" },
  { number: "2990", name: "Ovriga upplupna kostnader", type: "LIABILITY" },
  { number: "1790", name: "Ovriga forutbetalda kostnader", type: "ASSET" },
  { number: "6351", name: "Konstaterade kundforluster", type: "EXPENSE" },
  { number: "2121", name: "Periodiseringsfond", type: "EQUITY" },
  { number: "8811", name: "Avsattning till periodiseringsfond", type: "EXPENSE" },
  { number: "8910", name: "Skatt pa arets resultat", type: "EXPENSE" },
  { number: "2510", name: "Skatteskulder", type: "LIABILITY" },
];

const DEFAULT_POSTING_RULES: Array<{
  sourceType: JournalEntrySourceType;
  triggerKey: string;
  debitAccountNumber?: string;
  creditAccountNumber?: string;
  defaultVatRate?: number;
  description: string;
}> = [
  {
    sourceType: "INVOICE",
    triggerKey: "SERVICE_INVOICE_25",
    debitAccountNumber: "1510",
    creditAccountNumber: "3001",
    defaultVatRate: 25,
    description: "Standardbokning for kundfaktura med 25% moms.",
  },
  {
    sourceType: "MATERIAL",
    triggerKey: "MATERIAL_PURCHASE_STANDARD",
    debitAccountNumber: "4010",
    creditAccountNumber: "1930",
    defaultVatRate: 25,
    description: "Standardbokning for materialinkop med ingaende moms.",
  },
  {
    sourceType: "PAYROLL",
    triggerKey: "PAYROLL_STANDARD",
    debitAccountNumber: "7010",
    creditAccountNumber: "2910",
    description: "Standardbokning for loner innan utbetalning.",
  },
];

type DbLike = typeof prisma | Prisma.TransactionClient;

export const accountTypeLabels: Record<AccountType, string> = {
  ASSET: "Tillgang",
  LIABILITY: "Skuld",
  EQUITY: "Eget kapital",
  REVENUE: "Intakt",
  EXPENSE: "Kostnad",
};

export const journalSourceTypeLabels: Record<JournalEntrySourceType, string> = {
  INVOICE: "Faktura",
  MATERIAL: "Material",
  PAYROLL: "Lon",
  CUSTOMER_PAYMENT: "Kundbetalning",
  WRITE_OFF: "Nedskrivning kundfordran",
  YEAR_END: "Arsbokslut",
  MANUAL: "Manuell",
};

export const journalEntryStatusLabels: Record<JournalEntryStatus, string> = {
  DRAFT: "Utkast",
  REVIEWED: "Granskad",
  POSTED: "Bokford",
};

export function getJournalEntryStatusTone(status: JournalEntryStatus) {
  if (status === "POSTED") {
    return "success" as const;
  }
  if (status === "REVIEWED") {
    return "accent" as const;
  }
  return "default" as const;
}

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

function ensureBalancedLines(lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>) {
  const totals = lines.reduce(
    (acc, line) => ({
      debit: acc.debit.add(line.debit),
      credit: acc.credit.add(line.credit),
    }),
    { debit: ZERO, credit: ZERO },
  );

  if (!totals.debit.equals(totals.credit)) {
    throw new Error("Verifikationen balanserar inte.");
  }

  return totals;
}

async function getAccountMap(companyId: string, db: DbLike) {
  await seedDefaultAccounts(companyId, db);
  await seedDefaultPostingRules(companyId, db);

  const accounts = await db.account.findMany({
    where: {
      companyId,
    },
  });

  return new Map(accounts.map((account) => [account.number, account]));
}

async function resolvePostingRule(
  companyId: string,
  sourceType: JournalEntrySourceType,
  triggerKey: string,
  db: DbLike,
) {
  await seedDefaultPostingRules(companyId, db);

  return db.postingRule.findFirst({
    where: {
      companyId,
      sourceType,
      triggerKey,
      isActive: true,
    },
  });
}

export async function seedDefaultAccounts(
  companyId: string,
  db: DbLike = prisma,
) {
  await Promise.all(
    BAS_DEFAULT_ACCOUNTS.map((account) =>
      db.account.upsert({
        where: {
          companyId_number: {
            companyId,
            number: account.number,
          },
        },
        update: {
          name: account.name,
          type: account.type,
          vatCode: account.vatCode ?? null,
          isDefault: true,
        },
        create: {
          companyId,
          number: account.number,
          name: account.name,
          type: account.type,
          vatCode: account.vatCode ?? null,
          isDefault: true,
        },
      }),
    ),
  );

  return db.account.findMany({
    where: {
      companyId,
    },
    orderBy: {
      number: "asc",
    },
  });
}

export async function seedDefaultPostingRules(
  companyId: string,
  db: DbLike = prisma,
) {
  const accountMap = await getAccountMapWithoutRules(companyId, db);

  await Promise.all(
    DEFAULT_POSTING_RULES.map((rule) =>
      db.postingRule.upsert({
        where: {
          companyId_sourceType_triggerKey: {
            companyId,
            sourceType: rule.sourceType,
            triggerKey: rule.triggerKey,
          },
        },
        update: {
          debitAccountId: rule.debitAccountNumber
            ? accountMap.get(rule.debitAccountNumber)?.id ?? null
            : null,
          creditAccountId: rule.creditAccountNumber
            ? accountMap.get(rule.creditAccountNumber)?.id ?? null
            : null,
          defaultVatRate:
            typeof rule.defaultVatRate === "number"
              ? decimal(rule.defaultVatRate)
              : null,
          description: rule.description,
          isActive: true,
        },
        create: {
          companyId,
          sourceType: rule.sourceType,
          triggerKey: rule.triggerKey,
          debitAccountId: rule.debitAccountNumber
            ? accountMap.get(rule.debitAccountNumber)?.id ?? null
            : null,
          creditAccountId: rule.creditAccountNumber
            ? accountMap.get(rule.creditAccountNumber)?.id ?? null
            : null,
          defaultVatRate:
            typeof rule.defaultVatRate === "number"
              ? decimal(rule.defaultVatRate)
              : null,
          description: rule.description,
          isActive: true,
        },
      }),
    ),
  );

  return db.postingRule.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: [{ sourceType: "asc" }, { triggerKey: "asc" }],
  });
}

async function getAccountMapWithoutRules(companyId: string, db: DbLike) {
  await seedDefaultAccounts(companyId, db);

  const accounts = await db.account.findMany({
    where: {
      companyId,
    },
  });

  return new Map(accounts.map((account) => [account.number, account]));
}

async function createJournalEntry(
  db: DbLike,
  input: {
    companyId: string;
    date: Date;
    description: string;
    sourceType: JournalEntrySourceType;
    sourceId?: string | null;
    status?: JournalEntryStatus;
    lines: Array<{
      accountId: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      vatRate?: Prisma.Decimal | null;
      vatAmount?: Prisma.Decimal | null;
      description?: string | null;
    }>;
  },
  ) {
  if (input.sourceId) {
    const existing = await db.journalEntry.findFirst({
      where: {
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      include: {
        lines: true,
      },
    });

    if (existing) {
      return existing;
    }
  }

  await assertAccountingPeriodOpen(input.companyId, input.date, db);
  ensureBalancedLines(input.lines);

  return db.journalEntry.create({
    data: {
      companyId: input.companyId,
      date: input.date,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      status: input.status ?? "POSTED",
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: roundMoney(line.debit),
          credit: roundMoney(line.credit),
          vatRate: line.vatRate ?? null,
          vatAmount: line.vatAmount ?? null,
          description: line.description ?? null,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

export async function createManualJournalEntry(input: {
  companyId: string;
  date: Date;
  description: string;
  sourceId?: string | null;
  status?: JournalEntryStatus;
  lines: Array<{
    accountId: string;
    debit: Prisma.Decimal | number | string;
    credit: Prisma.Decimal | number | string;
    vatRate?: Prisma.Decimal | number | string | null;
    vatAmount?: Prisma.Decimal | number | string | null;
    description?: string | null;
  }>;
}) {
  return prisma.$transaction(async (tx) => createManualJournalEntryInDb(input, tx));
}

export async function createManualJournalEntryInDb(
  input: {
    companyId: string;
    date: Date;
    description: string;
    sourceId?: string | null;
    status?: JournalEntryStatus;
    lines: Array<{
      accountId: string;
      debit: Prisma.Decimal | number | string;
      credit: Prisma.Decimal | number | string;
      vatRate?: Prisma.Decimal | number | string | null;
      vatAmount?: Prisma.Decimal | number | string | null;
      description?: string | null;
    }>;
  },
  db: Prisma.TransactionClient,
) {
  return createJournalEntry(db, {
    companyId: input.companyId,
    date: input.date,
    description: input.description,
    sourceType: "MANUAL",
    sourceId: input.sourceId ?? null,
    status: input.status ?? "POSTED",
    lines: input.lines.map((line) => ({
      accountId: line.accountId,
      debit: decimal(line.debit),
      credit: decimal(line.credit),
      vatRate: line.vatRate === null || typeof line.vatRate === "undefined" ? null : decimal(line.vatRate),
      vatAmount:
        line.vatAmount === null || typeof line.vatAmount === "undefined"
          ? null
          : decimal(line.vatAmount),
      description: line.description ?? null,
    })),
  });
}

export async function createJournalEntryFromInvoice(invoiceId: string) {
  return prisma.$transaction(async (tx) => createJournalEntryFromInvoiceInDb(invoiceId, tx));
}

export async function createJournalEntryFromInvoiceInDb(
  invoiceId: string,
  db: Prisma.TransactionClient,
) {
  const invoice = await db.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      companyId: true,
      invoiceNumber: true,
      customerName: true,
      issueDate: true,
      status: true,
      totalNet: true,
      totalVat: true,
      totalGross: true,
    },
  });

  if (!invoice) {
    throw new Error("That invoice could not be found.");
  }

  if (invoice.status !== "SENT" && invoice.status !== "PAID") {
    throw new Error("Only sent invoices can be booked automatically.");
  }

  const accountMap = await getAccountMap(invoice.companyId, db);
  const postingRule = await resolvePostingRule(
    invoice.companyId,
    "INVOICE",
    "SERVICE_INVOICE_25",
    db,
  );

  const receivableAccountId = postingRule?.debitAccountId ?? accountMap.get("1510")?.id;
  const revenueAccountId = postingRule?.creditAccountId ?? accountMap.get("3001")?.id;
  const vatAccountId = accountMap.get("2611")?.id;

  if (!receivableAccountId || !revenueAccountId || !vatAccountId) {
    throw new Error("The company is missing required BAS accounts for invoice posting.");
  }

  return createJournalEntry(db, {
    companyId: invoice.companyId,
    date: invoice.issueDate,
    description: `Faktura ${invoice.invoiceNumber} - ${invoice.customerName}`,
    sourceType: "INVOICE",
    sourceId: invoice.id,
    status: "POSTED",
    lines:
      decimal(invoice.totalGross).greaterThanOrEqualTo(ZERO)
        ? [
            {
              accountId: receivableAccountId,
              debit: decimal(invoice.totalGross),
              credit: ZERO,
              description: "Kundfordran",
            },
            {
              accountId: revenueAccountId,
              debit: ZERO,
              credit: decimal(invoice.totalNet),
              vatRate: decimal(25),
              description: "Tjansteintakt",
            },
            {
              accountId: vatAccountId,
              debit: ZERO,
              credit: decimal(invoice.totalVat),
              vatRate: decimal(25),
              vatAmount: decimal(invoice.totalVat),
              description: "Utgaende moms",
            },
          ]
        : [
            {
              accountId: receivableAccountId,
              debit: ZERO,
              credit: decimal(invoice.totalGross).abs(),
              description: "Krediterad kundfordran",
            },
            {
              accountId: revenueAccountId,
              debit: decimal(invoice.totalNet).abs(),
              credit: ZERO,
              vatRate: decimal(25),
              description: "Krediterad tjansteintakt",
            },
            {
              accountId: vatAccountId,
              debit: decimal(invoice.totalVat).abs(),
              credit: ZERO,
              vatRate: decimal(25),
              vatAmount: decimal(invoice.totalVat).abs(),
              description: "Omford utgaende moms",
            },
          ],
  });
}

export async function createJournalEntryFromMaterial(materialEntryId: string) {
  return prisma.$transaction(async (tx) => createJournalEntryFromMaterialInDb(materialEntryId, tx));
}

export async function createJournalEntryFromMaterialInDb(
  materialEntryId: string,
  db: Prisma.TransactionClient,
) {
  const material = await db.materialEntry.findUnique({
    where: {
      id: materialEntryId,
    },
    select: {
      id: true,
      companyId: true,
      projectId: true,
      description: true,
      quantity: true,
      unitCost: true,
      supplierName: true,
      vatRate: true,
      receiptDate: true,
      accountingStatus: true,
      journalEntryId: true,
    },
  });

  if (!material) {
    throw new Error("That material entry could not be found.");
  }

  if (material.journalEntryId) {
    return db.journalEntry.findUnique({
      where: {
        id: material.journalEntryId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  if (!material.vatRate) {
    throw new Error("Material posting needs a VAT rate before it can be booked.");
  }

  const accountMap = await getAccountMap(material.companyId, db);
  const postingRule = await resolvePostingRule(
    material.companyId,
    "MATERIAL",
    "MATERIAL_PURCHASE_STANDARD",
    db,
  );

  const expenseAccountId = postingRule?.debitAccountId ?? accountMap.get("4010")?.id;
  const bankAccountId = postingRule?.creditAccountId ?? accountMap.get("1930")?.id;
  const inputVatAccountId = accountMap.get("2641")?.id;

  if (!expenseAccountId || !bankAccountId || !inputVatAccountId) {
    throw new Error("The company is missing required BAS accounts for material posting.");
  }

  const vatRate = decimal(material.vatRate);
  const totalNet = roundMoney(decimal(material.quantity).mul(decimal(material.unitCost)));
  const totalVat = roundMoney(totalNet.mul(vatRate).div(HUNDRED));
  const totalGross = roundMoney(totalNet.add(totalVat));

  const journalEntry = await createJournalEntry(db, {
    companyId: material.companyId,
    date: material.receiptDate ?? new Date(),
    description: `Materialinkop - ${material.description}`,
    sourceType: "MATERIAL",
    sourceId: material.id,
    status: "POSTED",
    lines: [
      {
        accountId: expenseAccountId,
        debit: totalNet,
        credit: ZERO,
        description: material.description,
      },
      {
        accountId: inputVatAccountId,
        debit: totalVat,
        credit: ZERO,
        vatRate,
        vatAmount: totalVat,
        description: "Ingaende moms",
      },
      {
        accountId: bankAccountId,
        debit: ZERO,
        credit: totalGross,
        description: material.supplierName || material.description,
      },
    ],
  });

  await db.materialEntry.update({
    where: {
      id: material.id,
    },
    data: {
      accountingStatus: "BOOKED",
      journalEntryId: journalEntry.id,
    },
  });

  return journalEntry;
}

export async function createJournalEntryFromPayrollRun(payrollRunId: string) {
  return prisma.$transaction(async (tx) => createJournalEntryFromPayrollRunInDb(payrollRunId, tx));
}

export async function createJournalEntryFromPayrollRunInDb(
  payrollRunId: string,
  db: Prisma.TransactionClient,
) {
  const payrollRun = await db.payrollRun.findUnique({
    where: {
      id: payrollRunId,
    },
    select: {
      id: true,
      companyId: true,
      title: true,
      periodEnd: true,
      totalGross: true,
      totalEmployerContribution: true,
      totalTax: true,
      totalNet: true,
      journalEntryId: true,
    },
  });

  if (!payrollRun) {
    throw new Error("That payroll run could not be found.");
  }

  if (payrollRun.journalEntryId) {
    return db.journalEntry.findUnique({
      where: {
        id: payrollRun.journalEntryId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  const accountMap = await getAccountMap(payrollRun.companyId, db);
  const salaryAccountId = accountMap.get("7010")?.id;
  const employerFeeAccountId = accountMap.get("7510")?.id;
  const taxAccountId = accountMap.get("2710")?.id;
  const accruedSalaryAccountId = accountMap.get("2910")?.id;

  if (!salaryAccountId || !employerFeeAccountId || !taxAccountId || !accruedSalaryAccountId) {
    throw new Error("The company is missing required BAS accounts for payroll posting.");
  }

  const grossSalary = decimal(payrollRun.totalGross);
  const employerContribution = decimal(payrollRun.totalEmployerContribution);
  const withheldTax = decimal(payrollRun.totalTax);
  const netPay = decimal(payrollRun.totalNet);

  const journalEntry = await createJournalEntry(db, {
    companyId: payrollRun.companyId,
    date: payrollRun.periodEnd,
    description: `Lonekorning - ${payrollRun.title}`,
    sourceType: "PAYROLL",
    sourceId: payrollRun.id,
    status: "POSTED",
    lines: [
      {
        accountId: salaryAccountId,
        debit: grossSalary,
        credit: ZERO,
        description: "Bruttoloner",
      },
      {
        accountId: employerFeeAccountId,
        debit: employerContribution,
        credit: ZERO,
        description: "Arbetsgivaravgifter",
      },
      {
        accountId: taxAccountId,
        debit: ZERO,
        credit: withheldTax,
        description: "Avdragen skatt",
      },
      {
        accountId: accruedSalaryAccountId,
        debit: ZERO,
        credit: netPay.add(employerContribution),
        description: "Skuld till lon och avgifter",
      },
    ],
  });

  await db.payrollRun.update({
    where: {
      id: payrollRun.id,
    },
    data: {
      journalEntryId: journalEntry.id,
    },
  });

  return journalEntry;
}

export async function createJournalEntryFromCustomerPayment(customerPaymentId: string) {
  return prisma.$transaction(async (tx) =>
    createJournalEntryFromCustomerPaymentInDb(customerPaymentId, tx),
  );
}

export async function createJournalEntryFromCustomerPaymentInDb(
  customerPaymentId: string,
  db: Prisma.TransactionClient,
) {
  const payment = await db.customerPayment.findUnique({
    where: {
      id: customerPaymentId,
    },
    select: {
      id: true,
      companyId: true,
      invoiceId: true,
      journalEntryId: true,
      date: true,
      amount: true,
      reference: true,
      invoice: {
        select: {
          invoiceNumber: true,
          customerName: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("That customer payment could not be found.");
  }

  if (payment.journalEntryId) {
    return db.journalEntry.findUnique({
      where: {
        id: payment.journalEntryId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  if (!payment.invoiceId) {
    throw new Error("Customer payments need an invoice match before they can be posted.");
  }

  const accountMap = await getAccountMap(payment.companyId, db);
  const bankAccountId = accountMap.get("1930")?.id;
  const receivableAccountId = accountMap.get("1510")?.id;

  if (!bankAccountId || !receivableAccountId) {
    throw new Error("The company is missing required BAS accounts for customer payment posting.");
  }

  const amount = decimal(payment.amount);
  const journalEntry = await createJournalEntry(db, {
    companyId: payment.companyId,
    date: payment.date,
    description: `Kundbetalning ${payment.invoice?.invoiceNumber ?? ""} ${payment.invoice?.customerName ?? ""}`.trim(),
    sourceType: "CUSTOMER_PAYMENT",
    sourceId: payment.id,
    status: "POSTED",
    lines: [
      {
        accountId: bankAccountId,
        debit: amount,
        credit: ZERO,
        description: payment.reference ?? "Inbetalning till bank",
      },
      {
        accountId: receivableAccountId,
        debit: ZERO,
        credit: amount,
        description: payment.invoice?.invoiceNumber ?? "Reglering kundfordran",
      },
    ],
  });

  await db.customerPayment.update({
    where: {
      id: payment.id,
    },
    data: {
      journalEntryId: journalEntry.id,
    },
  });

  return journalEntry;
}

export async function createJournalEntryFromInvoiceWriteOff(writeOffId: string) {
  return prisma.$transaction(async (tx) =>
    createJournalEntryFromInvoiceWriteOffInDb(writeOffId, tx),
  );
}

export async function createJournalEntryFromInvoiceWriteOffInDb(
  writeOffId: string,
  db: Prisma.TransactionClient,
) {
  const writeOff = await db.invoiceWriteOff.findUnique({
    where: {
      id: writeOffId,
    },
    select: {
      id: true,
      companyId: true,
      invoiceId: true,
      journalEntryId: true,
      amount: true,
      date: true,
      reason: true,
      invoice: {
        select: {
          invoiceNumber: true,
          customerName: true,
        },
      },
    },
  });

  if (!writeOff) {
    throw new Error("That write-off could not be found.");
  }

  if (writeOff.journalEntryId) {
    return db.journalEntry.findUnique({
      where: {
        id: writeOff.journalEntryId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  const accountMap = await getAccountMap(writeOff.companyId, db);
  const badDebtAccountId = accountMap.get("6351")?.id;
  const receivableAccountId = accountMap.get("1510")?.id;

  if (!badDebtAccountId || !receivableAccountId) {
    throw new Error("The company is missing required BAS accounts for invoice write-offs.");
  }

  const amount = decimal(writeOff.amount);
  const journalEntry = await createJournalEntry(db, {
    companyId: writeOff.companyId,
    date: writeOff.date,
    description: `Kundforlust ${writeOff.invoice?.invoiceNumber ?? ""} ${writeOff.invoice?.customerName ?? ""}`.trim(),
    sourceType: "WRITE_OFF",
    sourceId: writeOff.id,
    status: "POSTED",
    lines: [
      {
        accountId: badDebtAccountId,
        debit: amount,
        credit: ZERO,
        description: writeOff.reason ?? "Konstaterad kundforlust",
      },
      {
        accountId: receivableAccountId,
        debit: ZERO,
        credit: amount,
        description: writeOff.invoice?.invoiceNumber ?? "Reglering kundfordran",
      },
    ],
  });

  await db.invoiceWriteOff.update({
    where: {
      id: writeOff.id,
    },
    data: {
      journalEntryId: journalEntry.id,
    },
  });

  return journalEntry;
}

type LedgerFilters = {
  accountId?: string;
  sourceType?: JournalEntrySourceType;
  status?: JournalEntryStatus;
  dateFrom?: Date | null;
  dateTo?: Date | null;
};

export async function getGeneralLedger(companyId: string, filters: LedgerFilters = {}) {
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      journalEntry: {
        companyId,
        ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.dateFrom || filters.dateTo
          ? {
              date: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      journalEntry: true,
      account: true,
    },
    orderBy: [{ journalEntry: { date: "asc" } }, { id: "asc" }],
  });

  let runningBalance = ZERO;

  return lines.map((line) => {
    runningBalance = runningBalance.add(line.debit).sub(line.credit);

    return {
      id: line.id,
      date: line.journalEntry.date,
      description: line.description ?? line.journalEntry.description,
      sourceType: line.journalEntry.sourceType,
      sourceId: line.journalEntry.sourceId,
      status: line.journalEntry.status,
      account: line.account,
      debit: line.debit,
      credit: line.credit,
      vatRate: line.vatRate,
      vatAmount: line.vatAmount,
      balance: runningBalance,
    };
  });
}

export async function getTrialBalance(companyId: string) {
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
      },
    },
    include: {
      account: true,
    },
  });

  const grouped = new Map<
    string,
    {
      accountId: string;
      number: string;
      name: string;
      type: AccountType;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      balance: Prisma.Decimal;
    }
  >();

  for (const line of lines) {
    const key = line.accountId;
    const current =
      grouped.get(key) ??
      {
        accountId: line.accountId,
        number: line.account.number,
        name: line.account.name,
        type: line.account.type,
        debit: ZERO,
        credit: ZERO,
        balance: ZERO,
      };

    current.debit = current.debit.add(line.debit);
    current.credit = current.credit.add(line.credit);
    current.balance = current.debit.sub(current.credit);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.number.localeCompare(b.number));
}

export async function getProfitAndLoss(companyId: string) {
  const trialBalance = await getTrialBalance(companyId);
  const rows = trialBalance.filter(
    (row) => row.type === "REVENUE" || row.type === "EXPENSE",
  );

  const revenue = rows
    .filter((row) => row.type === "REVENUE")
    .reduce((sum, row) => sum.add(row.credit.sub(row.debit)), ZERO);
  const expenses = rows
    .filter((row) => row.type === "EXPENSE")
    .reduce((sum, row) => sum.add(row.debit.sub(row.credit)), ZERO);

  return {
    rows,
    totals: {
      revenue,
      expenses,
      result: revenue.sub(expenses),
    },
  };
}

export async function getBalanceSheet(companyId: string) {
  const trialBalance = await getTrialBalance(companyId);
  const assets = trialBalance.filter((row) => row.type === "ASSET");
  const liabilities = trialBalance.filter((row) => row.type === "LIABILITY");
  const equity = trialBalance.filter((row) => row.type === "EQUITY");

  return {
    assets,
    liabilities,
    equity,
    totals: {
      assets: assets.reduce((sum, row) => sum.add(row.balance), ZERO),
      liabilities: liabilities.reduce((sum, row) => sum.add(row.credit.sub(row.debit)), ZERO),
      equity: equity.reduce((sum, row) => sum.add(row.credit.sub(row.debit)), ZERO),
    },
  };
}

export function formatAccountingAmount(value: Prisma.Decimal | number | string) {
  return formatCurrency(value);
}
