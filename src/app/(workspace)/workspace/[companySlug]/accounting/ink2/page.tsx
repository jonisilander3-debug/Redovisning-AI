import { Ink2Page } from "@/components/accounting/ink2-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { getInk2RunStatusTone, ink2RunStatusLabels } from "@/lib/ink2";
import { prisma } from "@/lib/prisma";

export default async function AccountingInk2Page({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const runs = await prisma.ink2ReportRun.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      lines: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  return (
    <Ink2Page
      companySlug={companySlug}
      runs={runs.map((run) => ({
        id: run.id,
        year: run.year,
        statusLabel: ink2RunStatusLabels[run.status],
        statusTone: getInk2RunStatusTone(run.status),
        exportFormat: run.exportFormat,
        exportedAt: run.exportedAt?.toISOString() ?? null,
        lines: run.lines.map((line) => ({
          id: line.id,
          code: line.code,
          label: line.label,
          amount: line.amount.toString(),
        })),
      }))}
    />
  );
}
