import { VatReportsPage } from "@/components/accounting/vat-reports-page";
import { requireCompanyTimeAccess } from "@/lib/access";
import {
  getVatReportStatusTone,
  vatReportStatusLabels,
} from "@/lib/vat-reporting";
import { prisma } from "@/lib/prisma";

export default async function AccountingVatPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const reports = await prisma.vatReportRun.findMany({
    where: {
      companyId: viewer.company.id,
    },
    include: {
      correctionOf: {
        select: {
          periodStart: true,
          periodEnd: true,
        },
      },
      adjustments: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          description: true,
          outputVatDelta: true,
          inputVatDelta: true,
          date: true,
        },
      },
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
  });

  return (
    <VatReportsPage
      companySlug={companySlug}
      reports={reports.map((report) => ({
        id: report.id,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        status: report.status,
        statusLabel: vatReportStatusLabels[report.status],
        statusTone: getVatReportStatusTone(report.status),
        outputVat25: report.outputVat25.toString(),
        inputVat: report.inputVat.toString(),
        netVatPayable: report.netVatPayable.toString(),
        journalEntryCount: report.journalEntryCount,
        correctionOfLabel: report.correctionOf
          ? `${report.correctionOf.periodStart.toISOString().slice(0, 10)}-${report.correctionOf.periodEnd.toISOString().slice(0, 10)}`
          : null,
        lockedAt: report.lockedAt?.toISOString() ?? null,
        filedAt: report.filedAt?.toISOString() ?? null,
        settledAt: report.settledAt?.toISOString() ?? null,
        exportedAt: report.exportedAt?.toISOString() ?? null,
        adjustments: report.adjustments.map((adjustment) => ({
          id: adjustment.id,
          description: adjustment.description,
          outputVatDelta: adjustment.outputVatDelta.toString(),
          inputVatDelta: adjustment.inputVatDelta.toString(),
          date: adjustment.date.toISOString(),
        })),
      }))}
    />
  );
}
