import { NextResponse } from "next/server";
import { getCurrentWorkspaceViewer, canManageProjects } from "@/lib/access";
import {
  createProjectSchema,
  ensureAssignableUsersBelongToCompany,
  parseOptionalDate,
} from "@/lib/project-management";
import { prisma } from "@/lib/prisma";
import { getWorkTemplateById } from "@/lib/templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create projects." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createProjectSchema.safeParse(json);

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

    const preset = result.data.presetId
      ? await prisma.jobTypePreset.findFirst({
          where: {
            id: result.data.presetId,
            companyId: viewer.company.id,
            status: "ACTIVE",
          },
          include: {
            linkedProjectTemplate: true,
          },
        })
      : null;

    if (result.data.launchMode === "PRESET" && (!preset || !preset.linkedProjectTemplateId)) {
      return NextResponse.json(
        { message: "That preset could not be launched right now." },
        { status: 404 },
      );
    }

    const templateId =
      result.data.launchMode === "PRESET"
        ? preset?.linkedProjectTemplateId || ""
        : result.data.templateId;

    const template = templateId
      ? await getWorkTemplateById({
          companyId: viewer.company.id,
          templateId,
        })
      : null;

    if (templateId && (!template || template.templateType !== "PROJECT_TEMPLATE")) {
      return NextResponse.json(
        { message: "That project template could not be found." },
        { status: 404 },
      );
    }

    const project = await prisma.project.create({
      data: {
        companyId: viewer.company.id,
        customerId: quote?.customerId ?? customer?.id ?? null,
        quoteId: quote?.id ?? null,
        customerName: quote?.customer.name ?? customer?.name ?? result.data.customerName,
        title: result.data.title,
        description:
          result.data.description ||
          preset?.launchDescription ||
          template?.defaultProjectDescription ||
          null,
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
          create: result.data.assignedUserIds.map((userId) => ({
            userId,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    if (template) {
      for (const templateTask of template.tasks) {
        const createdTask = await prisma.task.create({
          data: {
            companyId: viewer.company.id,
            projectId: project.id,
            title: templateTask.title,
            description: templateTask.description || null,
          },
          select: {
            id: true,
          },
        });

        if (templateTask.checklistItems.length > 0) {
          await prisma.checklistItem.createMany({
            data: templateTask.checklistItems.map((item, itemIndex) => ({
              companyId: viewer.company.id,
              projectId: project.id,
              taskId: createdTask.id,
              title: item.title,
              description: item.description || null,
              sortOrder: itemIndex,
              sourceExecutionImprovementId: item.sourceExecutionImprovementId,
            })),
          });
        }
      }
    }

    return NextResponse.json({ ok: true, projectId: project.id });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "We could not create that project.",
      },
      { status: 400 },
    );
  }
}
