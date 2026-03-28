import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getBlockerSeverityLabel,
  getBlockerSeverityTone,
} from "@/lib/blockers";
import {
  getProjectRiskLabel,
  getProjectRiskTone,
  type ProjectRiskLevel,
} from "@/lib/project-risk";

type ProjectRiskOverviewPageProps = {
  companySlug: string;
  companyName: string;
  projects: Array<{
    id: string;
    customerName: string;
    title: string;
    level: ProjectRiskLevel;
    score: number;
    overdueTasks: number;
    openBlockers: number;
    highSeverityBlockers: number;
    recentReassignments: number;
    recentHandoffs: number;
    signals: string[];
    topBlockers: Array<{
      id: string;
      title: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      reporterName: string;
    }>;
  }>;
};

export function ProjectRiskOverviewPage({
  companySlug,
  companyName,
  projects,
}: ProjectRiskOverviewPageProps) {
  const summary = {
    highRisk: projects.filter((project) => project.level === "high").length,
    attention: projects.filter((project) => project.level === "attention").length,
    openBlockers: projects.reduce((sum, project) => sum + project.openBlockers, 0),
    overdueTasks: projects.reduce((sum, project) => sum + project.overdueTasks, 0),
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Risks"
        title="See what may threaten delivery next"
        description={`${companyName} can now spot blocked or drifting projects without reading every task one by one.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            High risk
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {summary.highRisk}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Projects that likely need attention first.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Needs attention
          </p>
          <p className="text-2xl font-semibold text-[var(--color-accent)]">
            {summary.attention}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Projects with early warning signals.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Open blockers
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {summary.openBlockers}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Reported blockers still waiting for action.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Overdue tasks
          </p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {summary.overdueTasks}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Work past due across the company projects.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Project risk overview
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Which projects need attention first
          </h2>
        </div>

        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/workspace/${companySlug}/projects/${project.id}`}
                      className="text-xl font-semibold text-[var(--color-foreground)]"
                    >
                      {project.title}
                    </Link>
                    <StatusBadge
                      label={getProjectRiskLabel(project.level)}
                      tone={getProjectRiskTone(project.level)}
                    />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {project.customerName}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Risk score
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {project.score}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Open blockers</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                    {project.openBlockers}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Overdue tasks</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
                    {project.overdueTasks}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Reassignments</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {project.recentReassignments}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Handoffs</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">
                    {project.recentHandoffs}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {project.signals.length > 0 ? (
                  project.signals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]"
                    >
                      {signal}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    No major delivery risk signals right now.
                  </div>
                )}
              </div>

              {project.topBlockers.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    Open blockers inside this project
                  </p>
                  {project.topBlockers.map((blocker) => (
                    <div key={blocker.id} className="rounded-[18px] bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--color-foreground)]">
                          {blocker.title}
                        </p>
                        <StatusBadge
                          label={getBlockerSeverityLabel(blocker.severity)}
                          tone={getBlockerSeverityTone(blocker.severity)}
                        />
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                        Reported by {blocker.reporterName}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
