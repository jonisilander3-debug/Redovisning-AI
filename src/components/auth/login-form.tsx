"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/company-select",
        redirect: false,
      });

      if (!result || result.error) {
        setError("We could not match those details. Please try again.");
        return;
      }

      window.location.href = result.url ?? "/";
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
          Sign in
        </h2>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Use the email and password connected to your company workspace.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />

        {error ? (
          <div className="rounded-[20px] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Continue to workspace"}
        </Button>
      </form>

      <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
        New here?{" "}
        <Link
          href="/onboarding"
          className="font-semibold text-[var(--color-primary)]"
        >
          Create your company workspace
        </Link>
      </p>
    </div>
  );
}
