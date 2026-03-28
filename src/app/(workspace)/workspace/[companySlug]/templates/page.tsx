import { TemplatesPage } from "@/components/templates/templates-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function TemplatesWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [templates, projects, tasks] = await Promise.all([
    prisma.workTemplate.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        tasks: {
          include: {
            checklistItems: true,
          },
        },
        checklistItems: true,
        linkedImprovements: true,
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.project.findMany({
      where: {
        companyId: viewer.company.id,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
    prisma.task.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    }),
  ]);

  return (
    <TemplatesPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      projectOptions={projects.map((project) => ({
        label: project.title,
        value: project.id,
      }))}
      taskOptions={tasks.map((task) => ({
        label: `${task.project.title} - ${task.title}`,
        value: task.id,
      }))}
      templates={templates.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        templateType: template.templateType,
        status: template.status,
        defaultProjectTitle: template.defaultProjectTitle,
        defaultTaskTitle: template.defaultTaskTitle,
        taskCount: template.tasks.length,
        checklistCount:
          template.checklistItems.length +
          template.tasks.reduce((sum, task) => sum + task.checklistItems.length, 0),
        linkedImprovementCount: template.linkedImprovements.length,
      }))}
    />
  );
}
