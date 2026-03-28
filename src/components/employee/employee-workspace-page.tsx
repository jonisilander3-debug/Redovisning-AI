import { Card } from "@/components/ui/card";
import { NumberDisplay } from "@/components/ui/number-display";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

type EmployeeWorkspacePageProps = {
  companyName: string;
  userName: string;
  roleLabel: string;
};

export function EmployeeWorkspacePage({
  companyName,
  userName,
  roleLabel,
}: EmployeeWorkspacePageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="My workspace"
        title={`Welcome, ${userName}`}
        description={`You are signed in to ${companyName} as ${roleLabel.toLowerCase()}. This employee view keeps daily work, kickoff priorities, and task follow-through clear without extra clutter.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card elevated className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Today starts clearly
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                One focused place for everyday work
              </h2>
            </div>
            <StatusBadge label={roleLabel} tone="accent" />
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            The employee portal is intentionally lighter than the company
            workspace. It is designed around My Day, My Work, kickoff context,
            and clear next steps without exposing broader admin controls.
          </p>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Current setup
          </p>
          <div>
            <NumberDisplay value="3" size="lg" />
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
              core employee work areas are ready to use
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            My day
          </p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            A calm daily overview
          </h3>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            A future place for today&apos;s priorities, schedule, and reminders.
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            My work
          </p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Clear next steps
          </h3>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            A future place for assigned work, progress, and follow-up tasks.
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Work clarity
          </p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
            Better starts, fewer missed steps
          </h3>
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            Kickoff notes, first-phase priorities, checklist steps, and task context now stay close to the work itself.
          </p>
        </Card>
      </section>
    </div>
  );
}
