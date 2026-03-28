"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

type WorkloadFiltersProps = {
  projectOptions: Array<{ label: string; value: string }>;
  memberOptions: Array<{ label: string; value: string }>;
};

export function WorkloadFilters({
  projectOptions,
  memberOptions,
}: WorkloadFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL") {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="Team member"
          name="userId"
          value={searchParams.get("userId") ?? ""}
          onChange={(event) => updateFilter("userId", event.target.value)}
          options={memberOptions}
        />
        <SelectField
          label="Project"
          name="projectId"
          value={searchParams.get("projectId") ?? ""}
          onChange={(event) => updateFilter("projectId", event.target.value)}
          options={projectOptions}
        />
        <SelectField
          label="Status"
          name="status"
          value={searchParams.get("status") ?? "ALL"}
          onChange={(event) => updateFilter("status", event.target.value)}
          options={[
            { label: "All statuses", value: "ALL" },
            { label: "To do", value: "TODO" },
            { label: "In progress", value: "IN_PROGRESS" },
            { label: "Done", value: "DONE" },
          ]}
        />
        <SelectField
          label="Date focus"
          name="dateScope"
          value={searchParams.get("dateScope") ?? "ALL"}
          onChange={(event) => updateFilter("dateScope", event.target.value)}
          options={[
            { label: "All timing", value: "ALL" },
            { label: "Upcoming", value: "UPCOMING" },
            { label: "Overdue", value: "OVERDUE" },
            { label: "Scheduled", value: "SCHEDULED" },
          ]}
        />
      </div>
    </Card>
  );
}
