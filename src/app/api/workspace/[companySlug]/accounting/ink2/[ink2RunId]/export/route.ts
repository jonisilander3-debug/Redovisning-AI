import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { buildInk2InfoContent, buildInk2SruContent } from "@/lib/skv-exports";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companySlug: string; ink2RunId: string }> },
) {
  const { companySlug, ink2RunId } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const run = await prisma.ink2ReportRun.findFirst({
    where: {
      id: ink2RunId,
      companyId: viewer.company.id,
    },
    include: {
      company: {
        select: {
          name: true,
          organizationNumber: true,
        },
      },
      lines: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ message: "INK2-underlaget kunde inte hittas." }, { status: 404 });
  }

  await prisma.ink2ReportRun.update({
    where: { id: run.id },
    data: { status: "EXPORTED", exportedAt: new Date(), exportFormat: "SRU_TEXT" },
  });

  const blanketter = buildInk2SruContent({
    organizationNumber: run.company.organizationNumber,
    year: run.year,
    lines: run.lines.map((line) => ({
      code: line.code,
      amount: line.amount,
    })),
  });

  const info = buildInk2InfoContent({
    companyName: run.company.name,
    organizationNumber: run.company.organizationNumber,
    year: run.year,
  });

  return new Response(`${info}\r\n\r\n${blanketter}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"ink2-${run.year}.sru\"`,
    },
  });
}
