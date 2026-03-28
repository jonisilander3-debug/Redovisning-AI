import { NextResponse } from "next/server";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { buildEmployerDeclarationXml } from "@/lib/skv-exports";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; declarationRunId: string }>;
  },
) {
    const { companySlug, declarationRunId } = await params;
    const viewer = await requireProjectManagementAccess(companySlug);

    const declaration = await prisma.employerDeclarationRun.findFirst({
      where: {
        id: declarationRunId,
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
          include: {
            user: {
              select: {
                name: true,
                taxTable: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        },
      },
    });

    if (!declaration) {
      return NextResponse.json({ message: "That declaration could not be found." }, { status: 404 });
    }

    await prisma.employerDeclarationRun.update({
      where: {
        id: declaration.id,
      },
      data: {
        exportedAt: new Date(),
        exportFormat: "SKV_XML_1_1",
      },
    });

    const xml = buildEmployerDeclarationXml({
      organizationNumber: declaration.company.organizationNumber,
      companyName: declaration.company.name,
      declarationId: declaration.id,
      periodStart: declaration.periodStart,
      periodEnd: declaration.periodEnd,
      createdAt: new Date(),
      totalGrossSalary: declaration.totalGrossSalary,
      totalTax: declaration.totalTax,
      totalEmployerContribution: declaration.totalEmployerContribution,
      lines: declaration.lines.map((line) => ({
        employeeName: line.user.name,
        taxTable: line.user.taxTable,
        grossSalary: line.grossSalary,
        taxAmount: line.taxAmount,
        employerContribution: line.employerContribution,
        benefitsAmount: line.benefitsAmount,
        absenceAdjustmentAmount: line.absenceAdjustmentAmount,
      })),
    });

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"agi-${declaration.periodEnd.toISOString().slice(0, 10)}.xml\"`,
      },
    });
}
