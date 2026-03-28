import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getEarlyPhaseHealthLabel,
  getEarlyPhaseHealthTone,
  type EarlyPhaseHealth,
} from "@/lib/project-early-phase";

type ProjectEarlyPhaseOverviewPageProps = {
  companySlug: string;
  companyName: string;
  projects: Array<{
    id: string;
    customerName: string;
    title: string;
    level: EarlyPhaseHealth;
    daysFromKickoff: number | null;
    completed: number;
    total: number;
    overdue: number;
    blocked: number;
    inProgress: number;
    signals: string[];
  }>;
};

export function ProjectEarlyPhaseOverviewPage({
  companySlug,
  companyName,
  projects,
}: ProjectEarlyPhaseOverviewPageProps) {
  const summary = {
    onTrack: projects.filter((project) => project.level === "healthy").length,
    attention: projects.filter((project) => project.level === "attention").length,
    offTrack: projects.filter((project) => project.level === "off_track").length,
    blocked: projects.reduce((sum, project) => sum + project.blocked, 0),
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Launch Health"
        title="See how the first week is actually going"
        description={`${companyName} can now spot early drift after kickoff and intervene before the project start slips.`}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">On track</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{summary.onTrack}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Projects with a healthy start.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Attention needed</p>
          <p className="text-2xl font-semibold text-[var(--color-accent)]">{summary.attention}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Starts that show early warning signs.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Off track</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.offTrack}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Projects that likely need intervention now.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Blocked kickoff work</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{summary.blocked}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">First-step tasks currently blocked.</p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">First-week overview</p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Which project starts are staying healthy
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
                      label={getEarlyPhaseHealthLabel(project.level)}
                      tone={getEarlyPhaseHealthTone(project.level)}
                    />
                    {project.daysFromKickoff !== null ? (
                      <StatusBadge label={`Day ${project.daysFromKickoff + 1}`} tone="primary" />
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{project.customerName}</p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-sm text-[var(--color-muted-foreground)]">First tasks done</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {project.completed}/{project.total}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">In progress</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{project.inProgress}</p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Overdue</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">{project.overdue}</p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Blocked</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">{project.blocked}</p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Tracked tasks</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{project.total}</p>
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
                    No early-phase concerns right now.
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
