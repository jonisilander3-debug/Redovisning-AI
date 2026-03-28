"use client";

import { TaskTimelineEventType } from "@prisma/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getTaskTimelineEventLabel,
  getTaskTimelineEventMarker,
  getTaskTimelineEventTone,
} from "@/lib/task-timeline";

type ProjectDeliveryTimelineProps = {
  title?: string;
  description?: string;
  canManage: boolean;
  events: Array<{
    id: string;
    type: TaskTimelineEventType;
    title: string;
    description: string | null;
    createdAt: string;
    taskId: string;
    taskTitle: string;
    user: {
      id: string;
      name: string;
    } | null;
  }>;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isRecentEvent(value: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(value) >= sevenDaysAgo;
}

export function ProjectDeliveryTimeline({
  title = "Recent delivery timeline",
  description = "See what changed across the project without opening every task.",
  canManage,
  events,
}: ProjectDeliveryTimelineProps) {
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [taskFilter, setTaskFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [rangeFilter, setRangeFilter] = useState("RECENT");

  const filteredEvents = events.filter((event) => {
    if (typeFilter !== "ALL" && event.type !== typeFilter) {
      return false;
    }

    if (taskFilter !== "ALL" && event.taskId !== taskFilter) {
      return false;
    }

    if (userFilter !== "ALL" && (event.user?.id ?? "SYSTEM") !== userFilter) {
      return false;
    }

    if (rangeFilter === "RECENT" && !isRecentEvent(event.createdAt)) {
      return false;
    }

    return true;
  });

  const taskOptions = [
    { label: "All tasks", value: "ALL" },
    ...Array.from(new Map(events.map((event) => [event.taskId, event.taskTitle])).entries()).map(
      ([value, label]) => ({
        label,
        value,
      }),
    ),
  ];

  const userOptions = [
    { label: "Anyone", value: "ALL" },
    ...Array.from(
      new Map(
        events
          .filter((event) => event.user)
          .map((event) => [event.user!.id, event.user!.name]),
      ).entries(),
    ).map(([value, label]) => ({
      label,
      value,
    })),
    { label: "Automatic updates", value: "SYSTEM" },
  ];

  const typeOptions = [
    { label: "All activity", value: "ALL" },
    ...Array.from(new Set(events.map((event) => event.type))).map((type) => ({
      label: getTaskTimelineEventLabel(type),
      value: type,
    })),
  ];

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Delivery overview
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="Activity type"
          name="timelineType"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          options={typeOptions}
        />
        <SelectField
          label="Task"
          name="timelineTask"
          value={taskFilter}
          onChange={(event) => setTaskFilter(event.target.value)}
          options={taskOptions}
        />
        <SelectField
          label="Person"
          name="timelineUser"
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
          options={userOptions}
        />
        <SelectField
          label="Time range"
          name="timelineRange"
          value={rangeFilter}
          onChange={(event) => setRangeFilter(event.target.value)}
          options={[
            { label: "Recent only", value: "RECENT" },
            { label: "All loaded activity", value: "ALL" },
          ]}
        />
      </div>

      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
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
                    {!canManage ? (
                      <StatusBadge label="Project context" tone="accent" />
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Task: {event.taskTitle}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {event.user ? `By ${event.user.name}` : "Recorded automatically"}
                  </p>
                  {event.description ? (
                    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
                      {event.description}
                    </p>
                  ) : null}
                </div>

                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatTimestamp(event.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] bg-[var(--color-surface)] px-4 py-5 text-sm leading-6 text-[var(--color-muted-foreground)]">
            No delivery activity matches the current filters.
          </div>
        )}
      </div>
    </Card>
  );
}
