import { NextResponse } from "next/server";
import { canManageProjects, getCurrentWorkspaceViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createTemplateSchema } from "@/lib/templates";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ companySlug: string }>;
  },
) {
  const { companySlug } = await params;
  const viewer = await getCurrentWorkspaceViewer(companySlug);

  if (!viewer) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  if (!canManageProjects(viewer.role)) {
    return NextResponse.json(
      { message: "Only company managers can create templates." },
      { status: 403 },
    );
  }

  const json = await request.json();
  const result = createTemplateSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { message: "Please complete the template details first." },
      { status: 400 },
    );
  }

  const sourceProject =
    result.data.templateType === "PROJECT_TEMPLATE" && result.data.sourceProjectId
      ? await prisma.project.findFirst({
          where: {
            id: result.data.sourceProjectId,
            companyId: viewer.company.id,
          },
          include: {
            tasks: {
              include: {
                checklistItems: {
                  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                },
              },
              orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
            },
          },
        })
      : null;

  const sourceTask =
    result.data.templateType === "TASK_TEMPLATE" && result.data.sourceTaskId
      ? await prisma.task.findFirst({
          where: {
            id: result.data.sourceTaskId,
            companyId: viewer.company.id,
          },
          include: {
            checklistItems: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
            appliedImprovements: {
              include: {
                executionImprovement: true,
              },
            },
          },
        })
      : null;

  if (result.data.templateType === "PROJECT_TEMPLATE" && result.data.sourceProjectId && !sourceProject) {
    return NextResponse.json(
      { message: "That source project could not be found." },
      { status: 404 },
    );
  }

  if (result.data.templateType === "TASK_TEMPLATE" && result.data.sourceTaskId && !sourceTask) {
    return NextResponse.json(
      { message: "That source task could not be found." },
      { status: 404 },
    );
  }

  const template = await prisma.workTemplate.create({
    data: {
      companyId: viewer.company.id,
      title: result.data.title,
      description: result.data.description || null,
      templateType: result.data.templateType,
      status: result.data.status,
      defaultProjectTitle:
        result.data.templateType === "PROJECT_TEMPLATE"
          ? result.data.defaultProjectTitle || sourceProject?.title || null
          : null,
      defaultProjectDescription:
        result.data.templateType === "PROJECT_TEMPLATE"
          ? result.data.defaultProjectDescription || sourceProject?.description || null
          : null,
      defaultTaskTitle:
        result.data.templateType === "TASK_TEMPLATE"
          ? result.data.defaultTaskTitle || sourceTask?.title || null
          : null,
      defaultTaskDescription:
        result.data.templateType === "TASK_TEMPLATE"
          ? result.data.defaultTaskDescription || sourceTask?.description || null
          : null,
    },
    select: {
      id: true,
    },
  });

  if (result.data.templateType === "PROJECT_TEMPLATE" && sourceProject) {
    for (const [taskIndex, task] of sourceProject.tasks.entries()) {
      const createdTemplateTask = await prisma.templateTask.create({
        data: {
          companyId: viewer.company.id,
          templateId: template.id,
          title: task.title,
          description: task.description || null,
          sortOrder: taskIndex,
        },
        select: {
          id: true,
        },
      });

      if (task.checklistItems.length > 0) {
        await prisma.templateChecklistItem.createMany({
          data: task.checklistItems.map((item, itemIndex) => ({
            companyId: viewer.company.id,
            templateId: template.id,
            templateTaskId: createdTemplateTask.id,
            title: item.title,
            description: item.description || null,
            sortOrder: itemIndex,
            sourceExecutionImprovementId: item.sourceExecutionImprovementId,
          })),
        });
      }
    }
  }

  if (result.data.templateType === "TASK_TEMPLATE" && sourceTask) {
    if (sourceTask.checklistItems.length > 0) {
      await prisma.templateChecklistItem.createMany({
        data: sourceTask.checklistItems.map((item, index) => ({
          companyId: viewer.company.id,
          templateId: template.id,
          title: item.title,
          description: item.description || null,
          sortOrder: index,
          sourceExecutionImprovementId: item.sourceExecutionImprovementId,
        })),
      });
    }

    if (sourceTask.appliedImprovements.length > 0) {
      await prisma.templateExecutionImprovement.createMany({
        data: sourceTask.appliedImprovements.map((applied) => ({
          templateId: template.id,
          executionImprovementId: applied.executionImprovementId,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true, templateId: template.id });
}
