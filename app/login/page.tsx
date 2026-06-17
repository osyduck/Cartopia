"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Faint amber glow behind the card — task-lamp warmth */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.70 0.150 52 / 0.10), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandMark className="size-12 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Cartopia</h1>
          <p className="mt-1 text-sm text-muted">PostgreSQL control panel</p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-surface elevation-2 p-8"
        >
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
            />
          </div>

          {state.error && (
            <p className="rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <SubmitButton className="w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
