"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Admin password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/20"
        />
      </div>
      {state.error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-critical-ink">
          <span aria-hidden className="inline-block size-1.5 rounded-full bg-critical" />
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-surface transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
