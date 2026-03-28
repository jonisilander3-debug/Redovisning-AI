import { TaskTimelineEventType } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getTaskTimelineEventLabel,
  getTaskTimelineEventMarker,
  getTaskTimelineEventTone,
} from "@/lib/task-timeline";

type TaskTimelinePanelProps = {
  events: Array<{
    id: string;
    type: TaskTimelineEventType;
    title: string;
    description: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
    } | null;
  }>;
  compact?: boolean;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskTimelinePanel({
  events,
  compact = false,
}: TaskTimelinePanelProps) {
  const visibleEvents = compact ? events.slice(0, 4) : events;

  return (
    <Card className="space-y-4 border border-[var(--color-border)] bg-white p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Task timeline
        </p>
        <h4 className="text-lg font-semibold text-[var(--color-foreground)]">
          What happened to this work over time
        </h4>
      </div>

      <div className="space-y-3">
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-[20px] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                    {getTaskTimelineEventMarker(event.type)}
                  </div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {event.title}
                  </p>
                  <StatusBadge
                    label={getTaskTimelineEventLabel(event.type)}
                    tone={getTaskTimelineEventTone(event.type)}
                  />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatTimestamp(event.createdAt)}
                </p>
              </div>

              <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                {event.user ? `By ${event.user.name}` : "Recorded automatically"}
              </p>

              {event.description ? (
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                  {event.description}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No timeline events yet. Changes to status, assignment, checklist work, and task time will appear here.
          </div>
        )}
      </div>
    </Card>
  );
}
