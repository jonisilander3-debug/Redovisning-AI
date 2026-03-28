"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";

type WeeklyPlanFiltersProps = {
  memberOptions: Array<{ label: string; value: string }>;
  projectOptions: Array<{ label: string; value: string }>;
};

export function WeeklyPlanFilters({
  memberOptions,
  projectOptions,
}: WeeklyPlanFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "ALL" || value === "false") {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    if (name === "overloadedOnly" && value === "true") {
      params.delete("availableOnly");
    }

    if (name === "availableOnly" && value === "true") {
      params.delete("overloadedOnly");
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          label="Priority"
          name="priority"
          value={searchParams.get("priority") ?? "ALL"}
          onChange={(event) => updateFilter("priority", event.target.value)}
          options={[
            { label: "All priorities", value: "ALL" },
            { label: "Low", value: "LOW" },
            { label: "Medium", value: "MEDIUM" },
            { label: "High", value: "HIGH" },
          ]}
        />
        <SelectField
          label="Show overloaded"
          name="overloadedOnly"
          value={searchParams.get("overloadedOnly") ?? "false"}
          onChange={(event) => updateFilter("overloadedOnly", event.target.value)}
          options={[
            { label: "Everyone", value: "false" },
            { label: "Overloaded only", value: "true" },
          ]}
        />
        <SelectField
          label="Show available"
          name="availableOnly"
          value={searchParams.get("availableOnly") ?? "false"}
          onChange={(event) => updateFilter("availableOnly", event.target.value)}
          options={[
            { label: "Everyone", value: "false" },
            { label: "Available only", value: "true" },
          ]}
        />
      </div>
    </Card>
  );
}
