import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import {
  ensureAssignableUsersBelongToCompany,
  parseOptionalDate,
  updateProjectSchema,
} from "@/lib/project-management";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string; projectId: string }>;
  },
) {
  const { companySlug, projectId } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can update projects." },
      { status: 403 },
    );
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: viewer.company.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProject) {
    return NextResponse.json(
      { message: "That project could not be found." },
      { status: 404 },
    );
  }

  const json = await request.json();
  const result = updateProjectSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the project details first." },
      { status: 400 },
    );
  }

  try {
    await ensureAssignableUsersBelongToCompany(
      viewer.company.id,
      result.data.assignedUserIds,
    );

    const customer = result.data.customerId
      ? await prisma.customer.findFirst({
          where: {
            id: result.data.customerId,
            companyId: viewer.company.id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : null;

    const quote = result.data.quoteId
      ? await prisma.quote.findFirst({
          where: {
            id: result.data.quoteId,
            companyId: viewer.company.id,
          },
          select: {
            id: true,
            customerId: true,
            customer: {
              select: {
                name: true,
              },
            },
            totalNet: true,
            totalGross: true,
          },
        })
      : null;

    if (result.data.customerId && !customer) {
      return NextResponse.json(
        { message: "Den valda kunden kunde inte hittas." },
        { status: 404 },
      );
    }
    if (result.data.quoteId && !quote) {
      return NextResponse.json(
        { message: "Den valda offerten kunde inte hittas." },
        { status: 404 },
      );
    }
    if (quote && customer && quote.customerId !== customer.id) {
      return NextResponse.json(
        { message: "Offerten tillhör en annan kund än den valda projektkunden." },
        { status: 400 },
      );
    }

    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        customerId: quote?.customerId ?? customer?.id ?? null,
        quoteId: quote?.id ?? null,
        customerName: quote?.customer.name ?? customer?.name ?? result.data.customerName,
        title: result.data.title,
        description: result.data.description || null,
        status: result.data.status,
        commercialBasisType: quote ? "QUOTE" : result.data.commercialBasisType,
        budgetNet: quote?.totalNet ?? result.data.budgetNet ?? null,
        budgetGross: quote?.totalGross ?? result.data.budgetGross ?? null,
        budgetLaborValue: result.data.budgetLaborValue ?? null,
        budgetMaterialValue: result.data.budgetMaterialValue ?? null,
        startDate: parseOptionalDate(result.data.startDate),
        endDate: parseOptionalDate(result.data.endDate),
        location: result.data.location || null,
        assignments: {
          deleteMany: {},
          create: result.data.assignedUserIds.map((userId) => ({
            userId,
          })),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not update that project.",
      },
      { status: 400 },
    );
  }
}
