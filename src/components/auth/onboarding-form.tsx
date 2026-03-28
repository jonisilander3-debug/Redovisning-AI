"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { legalFormOptions } from "@/lib/company";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      organizationNumber: String(formData.get("organizationNumber") ?? ""),
      legalForm: String(formData.get("legalForm") ?? "LIMITED_COMPANY"),
    };

    startTransition(async () => {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message ?? "We could not create the workspace.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        callbackUrl: "/company-select",
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        setError("Your workspace was created, but automatic sign-in failed.");
        return;
      }

      window.location.href = signInResult.url ?? "/";
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
          Create your workspace
        </h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          You will become the owner of the company and can add more people
          later.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Your name"
            name="fullName"
            autoComplete="name"
            placeholder="Jane Doe"
            required
          />
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </div>

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Choose a secure password"
          required
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Company name"
            name="companyName"
            autoComplete="organization"
            placeholder="Northstar Studio AB"
            required
          />
          <TextField
            label="Organization number"
            name="organizationNumber"
            placeholder="559123-4567"
            required
          />
        </div>

        <SelectField
          label="Legal form"
          name="legalForm"
          defaultValue="LIMITED_COMPANY"
          options={legalFormOptions}
        />

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Creating workspace..." : "Create company workspace"}
        </Button>
      </form>

      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-primary)]"
        >
          Sign in here
        </Link>
      </p>
    </div>
  );
}
