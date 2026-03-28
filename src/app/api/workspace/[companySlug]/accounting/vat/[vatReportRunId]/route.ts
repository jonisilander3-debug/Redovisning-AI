import { NextResponse } from "next/server";
import { requireCompanyTimeAccess } from "@/lib/access";
import { createVatSettlementJournalEntryInDb } from "@/lib/vat-reporting";
import { updateVatReportStatusSchema } from "@/lib/vat-reporting";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; vatReportRunId: string }>;
  },
) {
  const { companySlug, vatReportRunId } = await params;
  const viewer = await requireCompanyTimeAccess(companySlug);

  const json = await request.json();
  const result = updateVatReportStatusSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Choose a valid VAT status." },
      { status: 400 },
    );
  }

  const report = await prisma.vatReportRun.findFirst({
    where: {
      id: vatReportRunId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!report) {
    return NextResponse.json({ message: "That VAT report could not be found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.vatReportRun.update({
      where: {
        id: report.id,
      },
      data: {
        status: result.data.status,
        lockedAt:
          result.data.status === "READY" || result.data.status === "FILED"
            ? new Date()
            : null,
        filedAt: result.data.status === "FILED" ? new Date() : null,
      },
    });

    if (result.data.status === "FILED") {
      await createVatSettlementJournalEntryInDb(report.id, tx);
    }
  });

  return NextResponse.json({ ok: true });
}
