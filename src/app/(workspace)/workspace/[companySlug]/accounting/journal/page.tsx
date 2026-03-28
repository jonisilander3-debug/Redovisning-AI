import { AccountingJournalPage } from "@/components/accounting/accounting-journal-page";
import {
  getJournalEntryStatusTone,
  journalEntryStatusLabels,
} from "@/lib/accounting";
import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceAccountingJournalPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const entries = await prisma.journalEntry.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              number: true,
              name: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AccountingJournalPage
      entries={entries.map((entry) => ({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        sourceType: entry.sourceType,
        statusLabel: journalEntryStatusLabels[entry.status],
        statusTone: getJournalEntryStatusTone(entry.status),
        lines: entry.lines.map((line) => ({
          id: line.id,
          debit: line.debit.toString(),
          credit: line.credit.toString(),
          description: line.description,
          account: line.account,
        })),
      }))}
    />
  );
}
