import { PresetsPage } from "@/components/presets/presets-page";
import { requireProjectManagementAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function PresetsWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);

  const [templates, presets] = await Promise.all([
    prisma.workTemplate.findMany({
      where: {
        companyId: viewer.company.id,
        templateType: "PROJECT_TEMPLATE",
      },
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
      },
    }),
    prisma.jobTypePreset.findMany({
      where: {
        companyId: viewer.company.id,
      },
      include: {
        linkedProjectTemplate: {
          include: {
            tasks: {
              include: {
                checklistItems: true,
              },
            },
            checklistItems: true,
            linkedImprovements: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  return (
    <PresetsPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      templateOptions={templates.map((template) => ({
        label: template.title,
        value: template.id,
      }))}
      presets={presets.map((preset) => ({
        id: preset.id,
        title: preset.title,
        description: preset.description,
        launchLabel: preset.launchLabel,
        launchDescription: preset.launchDescription,
        status: preset.status,
        linkedTemplateTitle: preset.linkedProjectTemplate?.title ?? null,
        taskCount: preset.linkedProjectTemplate?.tasks.length ?? 0,
        checklistCount:
          (preset.linkedProjectTemplate?.checklistItems.length ?? 0) +
          (preset.linkedProjectTemplate?.tasks.reduce(
            (sum, task) => sum + task.checklistItems.length,
            0,
          ) ?? 0),
        linkedImprovementCount: preset.linkedProjectTemplate?.linkedImprovements.length ?? 0,
      }))}
    />
  );
}
