"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";

type TeamMemberOption = {
  id: string;
  name: string;
  roleLabel: string;
};

type ProjectFormProps = {
  companySlug: string;
  mode: "create" | "edit";
  projectId?: string;
  title: string;
  description: string;
  submitLabel: string;
  defaultValues?: {
    customerId?: string;
    quoteId?: string;
    customerName: string;
    title: string;
    description: string;
    status: string;
    commercialBasisType?: string;
    budgetNet?: string;
    budgetGross?: string;
    budgetLaborValue?: string;
    budgetMaterialValue?: string;
    startDate: string;
    endDate: string;
    location: string;
    assignedUserIds: string[];
  };
  teamMembers: TeamMemberOption[];
  statusOptions: Array<{ label: string; value: string }>;
  templateOptions?: Array<{ label: string; value: string }>;
  presetOptions?: Array<{
    label: string;
    value: string;
    description?: string;
    templateId?: string | null;
    defaultTitle?: string | null;
    defaultDescription?: string | null;
  }>;
  customerOptions?: Array<{
    label: string;
    value: string;
  }>;
  quoteOptions?: Array<{
    label: string;
    value: string;
  }>;
  commercialBasisOptions?: Array<{
    label: string;
    value: string;
  }>;
};

export function ProjectForm({
  companySlug,
  mode,
  projectId,
  title,
  description,
  submitLabel,
  defaultValues,
  teamMembers,
  statusOptions,
  templateOptions = [],
  presetOptions = [],
  customerOptions = [],
  quoteOptions = [],
  commercialBasisOptions = [],
}: ProjectFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [launchMode, setLaunchMode] = useState("SCRATCH");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [projectTitle, setProjectTitle] = useState(defaultValues?.title ?? "");
  const [projectDescription, setProjectDescription] = useState(
    defaultValues?.description ?? "",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assignedUserIds = formData.getAll("assignedUserIds").map(String);

    const payload = {
      customerName: String(formData.get("customerName") ?? ""),
      customerId: String(formData.get("customerId") ?? ""),
      quoteId: String(formData.get("quoteId") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      status: String(formData.get("status") ?? ""),
      commercialBasisType: String(formData.get("commercialBasisType") ?? "RUNNING_WORK"),
      budgetNet: formData.get("budgetNet") ? Number(formData.get("budgetNet")) : undefined,
      budgetGross: formData.get("budgetGross") ? Number(formData.get("budgetGross")) : undefined,
      budgetLaborValue: formData.get("budgetLaborValue") ? Number(formData.get("budgetLaborValue")) : undefined,
      budgetMaterialValue: formData.get("budgetMaterialValue") ? Number(formData.get("budgetMaterialValue")) : undefined,
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      location: String(formData.get("location") ?? ""),
      assignedUserIds,
      launchMode: String(formData.get("launchMode") ?? "SCRATCH"),
      templateId: String(formData.get("templateId") ?? ""),
      presetId: String(formData.get("presetId") ?? ""),
    };

    const endpoint =
      mode === "create"
        ? `/api/workspace/${companySlug}/projects`
        : `/api/workspace/${companySlug}/projects/${projectId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        projectId?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "We could not save this project.");
        return;
      }

      if (mode === "create" && data.projectId) {
        router.push(`/workspace/${companySlug}/projects/${data.projectId}`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {mode === "create" ? "Create project" : "Project settings"}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          {title}
        </h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Customer"
            name="customerId"
            defaultValue={defaultValues?.customerId ?? ""}
            options={[{ label: "Choose saved customer if available", value: "" }, ...customerOptions]}
          />
          <TextField
            label="Customer name"
            name="customerName"
            defaultValue={defaultValues?.customerName}
            placeholder="Northwind Group"
            required
          />
          <TextField
            label="Project title"
            name="title"
            value={projectTitle}
            onChange={(event) => setProjectTitle(event.target.value)}
            placeholder="Spring office refresh"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Offert"
            name="quoteId"
            defaultValue={defaultValues?.quoteId ?? ""}
            options={[{ label: "Ingen offert kopplad", value: "" }, ...quoteOptions]}
          />
          <SelectField
            label="Kommersiell grund"
            name="commercialBasisType"
            defaultValue={defaultValues?.commercialBasisType ?? "RUNNING_WORK"}
            options={commercialBasisOptions}
          />
        </div>

        <TextAreaField
          label="Description"
          name="description"
          value={projectDescription}
          onChange={(event) => setProjectDescription(event.target.value)}
          placeholder="Short summary of the work"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {mode === "create" ? (
            <>
              <SelectField
                label="Start with"
                name="launchMode"
                defaultValue={launchMode}
                value={launchMode}
                onChange={(event) => setLaunchMode(event.target.value)}
                options={[
                  { label: "Start from scratch", value: "SCRATCH" },
                  { label: "Use template", value: "TEMPLATE" },
                  { label: "Use job preset", value: "PRESET" },
                ]}
              />
              <SelectField
                label="Project template"
                name="templateId"
                defaultValue={selectedTemplateId}
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                options={[{ label: "No template", value: "" }, ...templateOptions]}
              />
              <SelectField
                label="Job preset"
                name="presetId"
                defaultValue={selectedPresetId}
                value={selectedPresetId}
                onChange={(event) => {
                  const nextPresetId = event.target.value;
                  setSelectedPresetId(nextPresetId);

                  if (mode !== "create" || launchMode !== "PRESET" || !nextPresetId) {
                    return;
                  }

                  const preset = presetOptions.find((item) => item.value === nextPresetId);

                  if (!preset) {
                    return;
                  }

                  setProjectTitle(preset.defaultTitle ?? "");
                  setProjectDescription(preset.defaultDescription ?? "");
                  setSelectedTemplateId(preset.templateId ?? "");
                }}
                options={[
                  { label: "No preset", value: "" },
                  ...presetOptions.map((preset) => ({
                    label: preset.description
                      ? `${preset.label} - ${preset.description}`
                      : preset.label,
                    value: preset.value,
                  })),
                ]}
              />
            </>
          ) : null}
          <SelectField
            label="Status"
            name="status"
            defaultValue={defaultValues?.status ?? "PLANNED"}
            options={statusOptions}
          />
          <TextField
            label="Location or address"
            name="location"
            defaultValue={defaultValues?.location}
            placeholder="Optional"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TextField label="Budget netto" name="budgetNet" type="number" step="0.01" defaultValue={defaultValues?.budgetNet ?? ""} />
          <TextField label="Budget brutto" name="budgetGross" type="number" step="0.01" defaultValue={defaultValues?.budgetGross ?? ""} />
          <TextField label="Budget arbete" name="budgetLaborValue" type="number" step="0.01" defaultValue={defaultValues?.budgetLaborValue ?? ""} />
          <TextField label="Budget material" name="budgetMaterialValue" type="number" step="0.01" defaultValue={defaultValues?.budgetMaterialValue ?? ""} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Start date"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate}
          />
          <TextField
            label="End date"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Assigned team members
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {teamMembers.map((member) => (
              <label
                key={member.id}
                className="flex items-start gap-3 rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)]"
              >
                <input
                  type="checkbox"
                  name="assignedUserIds"
                  value={member.id}
                  defaultChecked={defaultValues?.assignedUserIds.includes(member.id)}
                  className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[var(--color-foreground)]">
                    {member.name}
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    {member.roleLabel}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full sm:w-auto" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
