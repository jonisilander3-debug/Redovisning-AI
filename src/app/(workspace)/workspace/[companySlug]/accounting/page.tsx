import { AccountingPage } from "@/components/accounting/accounting-page";
import {
  getBalanceSheet,
  getJournalEntryStatusTone,
  getProfitAndLoss,
  journalEntryStatusLabels,
  seedDefaultAccounts,
  seedDefaultPostingRules,
} from "@/lib/accounting";
import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceAccountingPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  await Promise.all([
    seedDefaultAccounts(viewer.company.id),
    seedDefaultPostingRules(viewer.company.id),
  ]);

  const [journalEntries, suggestions, profitAndLoss, balanceSheet] = await Promise.all([
    prisma.journalEntry.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        description: true,
        date: true,
        status: true,
      },
    }),
    prisma.accountingSuggestion.findMany({
      where: {
        companyId: viewer.company.id,
        status: "PENDING",
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        reasoning: true,
        confidenceScore: true,
      },
    }),
    getProfitAndLoss(viewer.company.id),
    getBalanceSheet(viewer.company.id),
  ]);

  const materialIds = suggestions
    .filter((item) => item.sourceType === "MATERIAL")
    .map((item) => item.sourceId);
  const payrollIds = suggestions
    .filter((item) => item.sourceType === "PAYROLL")
    .map((item) => item.sourceId);

  const [materials, payrollRuns, counts] = await Promise.all([
    materialIds.length > 0
      ? prisma.materialEntry.findMany({
          where: {
            id: {
              in: materialIds,
            },
          },
          select: {
            id: true,
            description: true,
          },
        })
      : [],
    payrollIds.length > 0
      ? prisma.payrollRun.findMany({
          where: {
            id: {
              in: payrollIds,
            },
          },
          select: {
            id: true,
            title: true,
          },
        })
      : [],
    prisma.journalEntry.groupBy({
      by: ["status"],
      where: {
        companyId: viewer.company.id,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const materialMap = new Map(materials.map((item) => [item.id, item.description]));
  const payrollMap = new Map(payrollRuns.map((item) => [item.id, item.title]));
  const postedCount = counts.find((item) => item.status === "POSTED")?._count._all ?? 0;
  const draftOrReviewedCount = counts
    .filter((item) => item.status !== "POSTED")
    .reduce((sum, item) => sum + item._count._all, 0);

  return (
    <AccountingPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      summary={{
        journalEntryCount: counts.reduce((sum, item) => sum + item._count._all, 0),
        pendingSuggestionCount: suggestions.length,
        postedCount,
        draftOrReviewedCount,
        assetsTotal: balanceSheet.totals.assets.toString(),
        resultTotal: profitAndLoss.totals.result.toString(),
      }}
      recentJournalEntries={journalEntries.map((entry) => ({
        id: entry.id,
        description: entry.description,
        date: entry.date,
        statusLabel: journalEntryStatusLabels[entry.status],
        tone: getJournalEntryStatusTone(entry.status),
      }))}
      recentSuggestions={suggestions.map((suggestion) => ({
        id: suggestion.id,
        sourceLabel:
          suggestion.sourceType === "MATERIAL"
            ? materialMap.get(suggestion.sourceId) ?? "Materialunderlag"
            : suggestion.sourceType === "PAYROLL"
              ? payrollMap.get(suggestion.sourceId) ?? "Loneunderlag"
              : "Manuellt underlag",
        sourceDescription:
          suggestion.sourceType === "MATERIAL"
            ? "Materialunderlag som behover bokforingsgranskning."
            : suggestion.sourceType === "PAYROLL"
              ? "Loneunderlag som behover bokforingsgranskning."
              : "Manuellt underlag som behover bokforingsgranskning.",
        reasoning: suggestion.reasoning,
        confidenceScore: suggestion.confidenceScore,
      }))}
    />
  );
}
