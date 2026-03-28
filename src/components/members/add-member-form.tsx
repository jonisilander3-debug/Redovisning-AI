"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";

type AddMemberFormProps = {
  companySlug: string;
  roleOptions: Array<{ label: string; value: string }>;
};

export function AddMemberForm({
  companySlug,
  roleOptions,
}: AddMemberFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [createdAccess, setCreatedAccess] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedAccess(null);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch(`/api/workspace/${companySlug}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        temporaryPassword?: string;
        email?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "We could not add that member.");
        return;
      }

      setCreatedAccess({
        email: data.email ?? payload.email,
        temporaryPassword: data.temporaryPassword ?? "",
      });
      form.reset();
      router.refresh();
    });
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          Add member
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
          Give someone initial access
        </h2>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField label="Full name" name="name" placeholder="Alex Johnson" required />
        <TextField
          label="Email address"
          name="email"
          type="email"
          placeholder="alex@company.com"
          required
        />
        <SelectField label="Role" name="role" options={roleOptions} defaultValue="EMPLOYEE" />

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Creating access..." : "Add member"}
        </Button>
      </form>

      {createdAccess ? (
        <div className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Initial access is ready
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Share these details manually until full invitation sending is added.
          </p>
          <div className="mt-4 space-y-1 text-sm text-[var(--color-foreground)]">
            <p>Email: {createdAccess.email}</p>
            <p>Temporary password: {createdAccess.temporaryPassword}</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
