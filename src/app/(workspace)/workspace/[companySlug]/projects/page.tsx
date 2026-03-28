import { ProjectsPage } from "@/components/projects/projects-page";
import { getRoleLabel, requireProjectManagementAccess } from "@/lib/access";
import { getVisibleProjectsForViewer } from "@/lib/project-management";
import { prisma } from "@/lib/prisma";
import { getActiveTemplates, getWorkTemplateTypeLabel } from "@/lib/templates";
import { getActiveJobTypePresets } from "@/lib/job-type-presets";

export default async function ProjectsWorkspacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const viewer = await requireProjectManagementAccess(companySlug);
  const projects = await getVisibleProjectsForViewer(viewer);

  const [teamMembers, projectTemplates, presets, customers, quotes] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyId: viewer.company.id,
        status: {
          not: "INACTIVE",
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    }),
    getActiveTemplates({
      companyId: viewer.company.id,
      templateType: "PROJECT_TEMPLATE",
    }),
    getActiveJobTypePresets(viewer.company.id),
    prisma.customer.findMany({
      where: {
        companyId: viewer.company.id,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.quote.findMany({
      where: {
        companyId: viewer.company.id,
        status: "ACCEPTED",
        projectId: null,
      },
      orderBy: [{ issueDate: "desc" }],
      select: {
        id: true,
        quoteNumber: true,
        title: true,
      },
    }),
  ]);

  return (
    <ProjectsPage
      companySlug={viewer.company.slug}
      companyName={viewer.company.name}
      projects={projects}
      teamMembers={teamMembers.map((member) => ({
        id: member.id,
        name: member.name,
        roleLabel: getRoleLabel(member.role),
      }))}
      templateOptions={projectTemplates.map((template) => ({
        label: `${template.title} (${getWorkTemplateTypeLabel(template.templateType)})`,
        value: template.id,
      }))}
      presetOptions={presets.map((preset) => ({
        label: preset.launchLabel || preset.title,
        value: preset.id,
        description: preset.launchDescription || preset.description || undefined,
        templateId: preset.linkedProjectTemplateId,
        defaultTitle: preset.linkedProjectTemplate?.defaultProjectTitle || preset.title,
        defaultDescription:
          preset.linkedProjectTemplate?.defaultProjectDescription ||
          preset.launchDescription ||
          preset.description,
      }))}
      customerOptions={customers.map((customer) => ({
        label: customer.name,
        value: customer.id,
      }))}
      quoteOptions={quotes.map((quote) => ({
        label: `${quote.quoteNumber} · ${quote.title}`,
        value: quote.id,
      }))}
    />
  );
}
