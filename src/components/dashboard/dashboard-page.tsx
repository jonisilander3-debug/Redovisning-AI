import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NumberDisplay } from "@/components/ui/number-display";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

const kpis = [
  {
    label: "Projects on track",
    value: "14",
    change: "Most active work is moving steadily through the current delivery window.",
    tone: "positive" as const,
    badge: "On track",
  },
  {
    label: "Needs attention",
    value: "4",
    change: "A small number of projects show early drift, blockers, or delayed kickoff work.",
    tone: "neutral" as const,
    badge: "Watch",
  },
  {
    label: "Active blockers",
    value: "7",
    change: "Most blockers already have follow-up owners and next actions in place.",
    tone: "negative" as const,
    badge: "Managed",
  },
  {
    label: "Active work",
    value: "26",
    change: "Tasks are spread across current delivery, kickoff follow-through, and quality work.",
    tone: "neutral" as const,
    badge: "Steady",
  },
];

const trendBars = [
  { label: "Mon", value: 32 },
  { label: "Tue", value: 44 },
  { label: "Wed", value: 36 },
  { label: "Thu", value: 58 },
  { label: "Fri", value: 63 },
  { label: "Sat", value: 28 },
  { label: "Sun", value: 40 },
];

const activity = [
  {
    title: "Kickoff was completed on a new project",
    meta: "The team, first tasks, and launch notes are now visible to everyone involved.",
    time: "30 min ago",
    tone: "success" as const,
  },
  {
    title: "A blocker follow-up was updated",
    meta: "Ownership and next action are now clear for one delayed task.",
    time: "2 hours ago",
    tone: "accent" as const,
  },
  {
    title: "Team hours were updated",
    meta: "This week's time entries are now almost complete.",
    time: "Today",
    tone: "primary" as const,
  },
];

const attentionItems = [
  {
    title: "Check two delayed kickoff tasks",
    description: "One newly started project is already showing drift in its first-step work.",
    badge: "Needs attention",
    tone: "danger" as const,
  },
  {
    title: "Review one repeated blocker pattern",
    description: "A known issue came back on another task without a stronger preventive step.",
    badge: "Worth checking",
    tone: "accent" as const,
  },
  {
    title: "Finish one launch follow-through review",
    description: "A recently started project needs a quick check to confirm the first week is still on track.",
    badge: "Almost done",
    tone: "primary" as const,
  },
];

type DashboardPageProps = {
  companyName: string;
  userName: string;
  roleLabel: string;
};

export function DashboardPage({
  companyName,
  userName,
  roleLabel,
}: DashboardPageProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="A clear view of project operations"
        description={`${companyName} now has one connected workspace for planning, delivery, launch follow-through, and quality control. ${userName} is signed in as ${roleLabel.toLowerCase()}.`}
        actions={
          <>
            <Button variant="secondary">Review planning</Button>
            <Button>Open launch health</Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card elevated className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Weekly momentum
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                Work is moving steadily through the week
              </h2>
            </div>
            <StatusBadge label="Upward trend" tone="success" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <div className="flex h-64 items-end gap-3 rounded-[24px] bg-white p-5">
              {trendBars.map((bar, index) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,var(--color-primary)_0%,var(--color-accent)_100%)]"
                      style={{
                        height: `${bar.value}%`,
                        opacity: index === 4 ? 1 : 0.72,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-[24px] bg-white p-5">
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  This week
                </p>
                <NumberDisplay value="+14.8%" tone="positive" size="lg" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  What this means
                </p>
                <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                  Delivery is steady, and most work is progressing without major
                  friction. This is a good moment to keep first-phase work and
                  blocker follow-through tight.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Today at a glance
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                A calm operating day
              </h2>
            </div>
            <StatusBadge label="Stable" tone="primary" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                New updates
              </p>
              <NumberDisplay value="08" size="md" />
            </div>
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Waiting on others
              </p>
              <NumberDisplay value="03" size="md" />
            </div>
            <div className="rounded-[22px] bg-white p-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Ready to finish
              </p>
              <NumberDisplay value="05" tone="positive" size="md" />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Recent activity
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                The latest project movement
              </h2>
            </div>
            <Button variant="ghost">See all</Button>
          </div>

          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-[22px] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-[var(--color-accent)]" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {item.title}
                    </p>
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {item.meta}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <StatusBadge label={item.time} tone={item.tone} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Needs attention
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                A short list, on purpose
              </h2>
            </div>

            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.title} className="rounded-[22px] bg-white p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {item.title}
                      </p>
                      <StatusBadge label={item.badge} tone={item.tone} />
                    </div>
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <EmptyState
            title="The operating system is connected"
            description="Projects now move from preset and template setup into kickoff, execution, risk handling, recovery, prevention, and reuse without leaving this module."
            action={<Button variant="secondary">Review project flow</Button>}
          />
        </div>
      </section>
    </div>
  );
}
