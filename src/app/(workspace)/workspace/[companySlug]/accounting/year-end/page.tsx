import { YearEndPage } from "@/components/accounting/year-end-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import { getInk2RunStatusTone, ink2RunStatusLabels } from "@/lib/ink2";
import { prisma } from "@/lib/prisma";
import {
  getYearEndAdjustmentStatusTone,
  yearEndAdjustmentStatusLabels,
  yearEndAdjustmentTypeLabels,
} from "@/lib/year-end-adjustments";
import { getYearEndSummary } from "@/lib/year-end";

const legalFormLabels = {
  SOLE_PROPRIETORSHIP: "Enskild firma",
  TRADING_PARTNERSHIP: "Handelsbolag",
  LIMITED_PARTNERSHIP: "Kommanditbolag",
  LIMITED_COMPANY: "Aktiebolag",
} as const;

export default async function AccountingYearEndPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { companySlug } = await params;
  const { year: yearParam } = await searchParams;
  const viewer = await requireCompanyTimeAccess(companySlug);
  const parsedYear = Number(yearParam ?? new Date().getUTCFullYear());
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getUTCFullYear();
  const company = await prisma.company.findUniqueOrThrow({
    where: {
      id: viewer.company.id,
    },
    select: {
      legalForm: true,
    },
  });
  const [summary, accounts, adjustments, ink2Run] = await Promise.all([
    getYearEndSummary(viewer.company.id, company.legalForm, year),
    prisma.account.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        number: "asc",
      },
      select: {
        id: true,
        number: true,
        name: true,
      },
    }),
    prisma.yearEndAdjustment.findMany({
      where: {
        companyId: viewer.company.id,
        year,
      },
      include: {
        debitAccount: { select: { number: true, name: true } },
        creditAccount: { select: { number: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.ink2ReportRun.findUnique({
      where: {
        companyId_year: {
          companyId: viewer.company.id,
          year,
        },
      },
      include: {
        lines: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    }),
  ]);

  return (
    <YearEndPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      year={year}
      legalFormLabel={legalFormLabels[company.legalForm]}
      taxModeLabel={
        company.legalForm === "LIMITED_COMPANY"
          ? "Automatisk bolagsskatt 20,6% i prototypen"
          : "Visas som arsbokslutsunderlag, utan automatisk skattebokning"
      }
      summary={{
        revenue: summary.totals.revenue.toString(),
        expenses: summary.totals.expenses.toString(),
        resultBeforeTax: summary.totals.resultBeforeTax.toString(),
        estimatedTaxRatePercent: summary.totals.estimatedTaxRate.mul(100).toString(),
        estimatedTax: summary.totals.estimatedTax.toString(),
        resultAfterTax: summary.totals.resultAfterTax.toString(),
        hasExistingTaxEntry: Boolean(summary.existingTaxEntry),
        existingTaxEntryDate: summary.existingTaxEntry?.date.toISOString().slice(0, 10) ?? null,
      }}
      accountOptions={accounts.map((account) => ({
        value: account.id,
        label: `${account.number} ${account.name}`,
      }))}
      adjustments={adjustments.map((adjustment) => ({
        id: adjustment.id,
        typeLabel: yearEndAdjustmentTypeLabels[adjustment.type],
        statusLabel: yearEndAdjustmentStatusLabels[adjustment.status],
        statusTone: getYearEndAdjustmentStatusTone(adjustment.status),
        date: adjustment.date.toISOString(),
        description: adjustment.description,
        amount: adjustment.amount.toString(),
        debitAccountLabel: `${adjustment.debitAccount.number} ${adjustment.debitAccount.name}`,
        creditAccountLabel: `${adjustment.creditAccount.number} ${adjustment.creditAccount.name}`,
        note: adjustment.note,
      }))}
      ink2Run={
        ink2Run
          ? {
              id: ink2Run.id,
              statusLabel: ink2RunStatusLabels[ink2Run.status],
              statusTone: getInk2RunStatusTone(ink2Run.status),
              exportedAt: ink2Run.exportedAt?.toISOString() ?? null,
              lines: ink2Run.lines.map((line) => ({
                id: line.id,
                code: line.code,
                label: line.label,
                amount: line.amount.toString(),
              })),
            }
          : null
      }
    />
  );
}
