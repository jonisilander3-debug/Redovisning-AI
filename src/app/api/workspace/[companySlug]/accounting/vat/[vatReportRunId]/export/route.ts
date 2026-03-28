import { requireCompanyTimeAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; vatReportRunId: string }>;
  },
) {
  const { companySlug, vatReportRunId } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const report = await prisma.vatReportRun.findFirst({
    where: {
      id: vatReportRunId,
      companyId: viewer.company.id,
    },
    include: {
      journalEntries: {
        include: {
          journalEntry: {
            select: {
              id: true,
              date: true,
              description: true,
              sourceType: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    return new Response("VAT report not found.", { status: 404 });
  }

  await prisma.vatReportRun.update({
    where: {
      id: report.id,
    },
    data: {
      exportedAt: new Date(),
    },
  });

  return new Response(
    JSON.stringify(
      {
        periodStart: report.periodStart.toISOString().slice(0, 10),
        periodEnd: report.periodEnd.toISOString().slice(0, 10),
        outputVat25: report.outputVat25.toString(),
        inputVat: report.inputVat.toString(),
        netVatPayable: report.netVatPayable.toString(),
        journalEntries: report.journalEntries.map((item) => ({
          id: item.journalEntry.id,
          date: item.journalEntry.date.toISOString().slice(0, 10),
          description: item.journalEntry.description,
          sourceType: item.journalEntry.sourceType,
        })),
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"vat-${report.periodEnd.toISOString().slice(0, 10)}.json\"`,
      },
    },
  );
}
