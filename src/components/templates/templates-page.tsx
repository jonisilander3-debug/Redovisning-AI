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
  getWorkTemplateStatusLabel,
  getWorkTemplateStatusTone,
  getWorkTemplateTypeLabel,
} from "@/lib/templates";

type TemplatesPageProps = {
  companySlug: string;
  companyName: string;
  projectOptions: Array<{ label: string; value: string }>;
  taskOptions: Array<{ label: string; value: string }>;
  templates: Array<{
    id: string;
    title: string;
    description: string | null;
    templateType: "PROJECT_TEMPLATE" | "TASK_TEMPLATE";
    status: "ACTIVE" | "ARCHIVED";
    defaultProjectTitle: string | null;
    defaultTaskTitle: string | null;
    taskCount: number;
    checklistCount: number;
    linkedImprovementCount: number;
  }>;
};

export function TemplatesPage({
  companySlug,
  companyName,
  projectOptions,
  taskOptions,
  templates,
}: TemplatesPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          templateType: String(formData.get("templateType") ?? "PROJECT_TEMPLATE"),
          status: String(formData.get("status") ?? "ACTIVE"),
          sourceProjectId: String(formData.get("sourceProjectId") ?? ""),
          sourceTaskId: String(formData.get("sourceTaskId") ?? ""),
          defaultProjectTitle: String(formData.get("defaultProjectTitle") ?? ""),
          defaultProjectDescription: String(formData.get("defaultProjectDescription") ?? ""),
          defaultTaskTitle: String(formData.get("defaultTaskTitle") ?? ""),
          defaultTaskDescription: String(formData.get("defaultTaskDescription") ?? ""),
        }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not save that template.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  function handleStatusUpdate(templateId: string, nextStatus: "ACTIVE" | "ARCHIVED") {
    startTransition(async () => {
      const template = templates.find((item) => item.id === templateId);

      if (!template) {
        return;
      }

      await fetch(`/api/workspace/${companySlug}/templates/${templateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: template.title,
          description: template.description ?? "",
          templateType: template.templateType,
          status: nextStatus,
          defaultProjectTitle: template.defaultProjectTitle ?? "",
          defaultProjectDescription: "",
          defaultTaskTitle: template.defaultTaskTitle ?? "",
          defaultTaskDescription: "",
        }),
      });

      router.refresh();
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Templates"
        title="Reuse repeatable work structures"
        description={`${companyName} can create lightweight templates from real projects and tasks so future work starts with clearer structure and fewer missing steps.`}
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold text-[var(--color-foreground)]">
                      {template.title}
                    </p>
                    <StatusBadge
                      label={getWorkTemplateTypeLabel(template.templateType)}
                      tone="primary"
                    />
                    <StatusBadge
                      label={getWorkTemplateStatusLabel(template.status)}
                      tone={getWorkTemplateStatusTone(template.status)}
                    />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {template.description || "No description added yet."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleStatusUpdate(
                      template.id,
                      template.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                    )
                  }
                  disabled={isPending}
                >
                  {template.status === "ACTIVE" ? "Archive" : "Reactivate"}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Recommended tasks</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {template.taskCount}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Checklist items</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {template.checklistCount}
                  </p>
                </div>
                <div className="rounded-[20px] bg-[var(--color-surface)] p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">Linked improvements</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">
                    {template.linkedImprovementCount}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Create template
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
              Save repeatable work as a reusable structure
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <TextField label="Template name" name="title" placeholder="Standard office refresh" required />
            <TextAreaField
              label="Description"
              name="description"
              placeholder="Short note about when this template is useful."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Template type"
                name="templateType"
                defaultValue="PROJECT_TEMPLATE"
                options={[
                  { label: "Project template", value: "PROJECT_TEMPLATE" },
                  { label: "Task template", value: "TASK_TEMPLATE" },
                ]}
              />
              <SelectField
                label="Status"
                name="status"
                defaultValue="ACTIVE"
                options={[
                  { label: "Active", value: "ACTIVE" },
                  { label: "Archived", value: "ARCHIVED" },
                ]}
              />
            </div>
            <SelectField
              label="Copy structure from project"
              name="sourceProjectId"
              defaultValue=""
              options={[{ label: "No source project", value: "" }, ...projectOptions]}
            />
            <SelectField
              label="Copy structure from task"
              name="sourceTaskId"
              defaultValue=""
              options={[{ label: "No source task", value: "" }, ...taskOptions]}
            />
            <TextField
              label="Default project title"
              name="defaultProjectTitle"
              placeholder="Optional project placeholder"
            />
            <TextAreaField
              label="Default project description"
              name="defaultProjectDescription"
              placeholder="Optional project placeholder description"
            />
            <TextField
              label="Default task title"
              name="defaultTaskTitle"
              placeholder="Optional task placeholder"
            />
            <TextAreaField
              label="Default task description"
              name="defaultTaskDescription"
              placeholder="Optional task placeholder description"
            />

            {error ? (
              <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create template"}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
