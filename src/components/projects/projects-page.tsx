import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { ProjectForm } from "@/components/projects/project-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getProjectStatusLabel,
  getProjectStatusTone,
  projectCommercialBasisOptions,
  projectStatusOptions,
} from "@/lib/project-management";

type ProjectsPageProps = {
  companySlug: string;
  companyName: string;
  projects: Array<{
    id: string;
    customerName: string;
    title: string;
    description: string | null;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    location: string | null;
    assignments: Array<{
      user: {
        id: string;
        name: string;
      };
    }>;
    _count: {
      timeEntries: number;
    };
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    roleLabel: string;
  }>;
  templateOptions: Array<{
    label: string;
    value: string;
  }>;
  presetOptions: Array<{
    label: string;
    value: string;
    description?: string;
    templateId?: string | null;
    defaultTitle?: string | null;
    defaultDescription?: string | null;
  }>;
  customerOptions: Array<{
    label: string;
    value: string;
  }>;
  quoteOptions: Array<{
    label: string;
    value: string;
  }>;
};

function formatDateRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate && !endDate) {
    return "Dates not set yet";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  if (startDate && endDate) {
    return `${formatter.format(startDate)} to ${formatter.format(endDate)}`;
  }

  return startDate
    ? `Starts ${formatter.format(startDate)}`
    : `Ends ${formatter.format(endDate!)}`;
}

export function ProjectsPage({
  companySlug,
  companyName,
  projects,
  teamMembers,
  templateOptions,
  presetOptions,
  customerOptions,
  quoteOptions,
}: ProjectsPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Projects"
        title="Keep work organized around real projects"
        description={`${companyName} can now connect time to clear pieces of work, assign people, and understand what time belongs to.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    {project.customerName}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                    {project.title}
                  </h2>
                </div>
                <StatusBadge
                  label={getProjectStatusLabel(project.status)}
                  tone={getProjectStatusTone(project.status)}
                />
              </div>

              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                {project.description || "No description added yet."}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Schedule
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-foreground)]">
                    {formatDateRange(project.startDate, project.endDate)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Team
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-foreground)]">
                    {project.assignments.length === 0
                      ? "No one assigned yet"
                      : project.assignments.map((assignment) => assignment.user.name).join(", ")}
                  </p>
                </div>
                <div className="rounded-[20px] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    Logged sessions
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-foreground)]">
                    {project._count.timeEntries}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/workspace/${companySlug}/projects/${project.id}`}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.8)] transition-colors hover:bg-[#1d4ed8]"
                >
                  Open project
                </Link>
              </div>
            </Card>
          ))}

          {projects.length === 0 ? (
            <Card className="space-y-3">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">
                No projects yet
              </p>
              <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                Create the first project to start connecting work time to real work.
              </p>
            </Card>
          ) : null}
        </div>

        <ProjectForm
          companySlug={companySlug}
          mode="create"
          title="Create a new project"
          description="Keep it lightweight. Add the customer name, a clear title, and the team assigned to it."
          submitLabel="Create project"
          teamMembers={teamMembers}
          statusOptions={projectStatusOptions}
          templateOptions={templateOptions}
          presetOptions={presetOptions}
          customerOptions={customerOptions}
          quoteOptions={quoteOptions}
          commercialBasisOptions={projectCommercialBasisOptions}
        />
      </section>
    </div>
  );
}
