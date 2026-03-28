"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import {
  getJobTypePresetStatusLabel,
  getJobTypePresetStatusTone,
} from "@/lib/job-type-presets";

type PresetsPageProps = {
  companySlug: string;
  companyName: string;
  templateOptions: Array<{ label: string; value: string }>;
  presets: Array<{
    id: string;
    title: string;
    description: string | null;
    launchLabel: string | null;
    launchDescription: string | null;
    status: "ACTIVE" | "ARCHIVED";
    linkedTemplateTitle: string | null;
    taskCount: number;
    checklistCount: number;
    linkedImprovementCount: number;
  }>;
};

export function PresetsPage({
  companySlug,
  companyName,
  templateOptions,
  presets,
}: PresetsPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/presets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          launchLabel: String(formData.get("launchLabel") ?? ""),
          launchDescription: String(formData.get("launchDescription") ?? ""),
          status: String(formData.get("status") ?? "ACTIVE"),
          linkedProjectTemplateId: String(formData.get("linkedProjectTemplateId") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that preset.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function handleStatusToggle(presetId: string, nextStatus: "ACTIVE" | "ARCHIVED") {
    startTransition(async () => {
      const preset = presets.find((item) => item.id === presetId);

      if (!preset) {
        return;
      }

      await fetch(`/api/workspace/${companySlug}/presets/${presetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: preset.title,
          description: preset.description ?? "",
          launchLabel: preset.launchLabel ?? "",
          launchDescription: preset.launchDescription ?? "",
          status: nextStatus,
          linkedProjectTemplateId:
            templateOptions.find((option) => option.label === preset.linkedTemplateTitle)?.value ?? "",
        }),
      });

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Job Presets"
        title="Launch repeat work in one fast step"
        description={`${companyName} can now save common job types as quick launch presets that point to the right project structure immediately.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {presets.map((preset) => (
            <Card key={preset.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold text-[var(--color-foreground)]">
                      {preset.launchLabel || preset.title}
                    </p>
                    <StatusBadge
                      label={getJobTypePresetStatusLabel(preset.status)}
                      tone={getJobTypePresetStatusTone(preset.status)}
                    />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {preset.launchDescription || preset.description || "No launch description added yet."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleStatusToggle(
                      preset.id,
                      preset.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                    )
                  }
                  disabled={isPending}
                >
                  {preset.status === "ACTIVE" ? "Archive" : "Reactivate"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Linked template</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {preset.linkedTemplateTitle || "None yet"}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Tasks</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {preset.taskCount}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Checklist items</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {preset.checklistCount}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Improvements</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
                    {preset.linkedImprovementCount}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Create preset
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Save a fast path for common jobs
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <TextField label="Preset title" name="title" placeholder="Office refresh" required />
            <TextAreaField
              label="Internal description"
              name="description"
              placeholder="What kind of work this preset is for"
            />
            <TextField
              label="Launch label"
              name="launchLabel"
              placeholder="Start office refresh"
            />
            <TextAreaField
              label="Launch description"
              name="launchDescription"
              placeholder="Short friendly helper text for the fast start card"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Status"
                name="status"
                defaultValue="ACTIVE"
                options={[
                  { label: "Active", value: "ACTIVE" },
                  { label: "Archived", value: "ARCHIVED" },
                ]}
              />
              <SelectField
                label="Linked project template"
                name="linkedProjectTemplateId"
                defaultValue=""
                options={[{ label: "No linked template", value: "" }, ...templateOptions]}
              />
            </div>

            {error ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create preset"}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
