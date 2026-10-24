"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/actions";
import Breadcrumbs from "@/components/Breadcrumbs";
import { btn, btn2, input, label, num, muted } from "@/lib/ui";

export default function Login() {
  const [state, action, pending] = useActionState(authenticate, null);
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs
        items={[{ label: "Summary", href: "/" }, { label: "Sign in" }]}
      />
      {/* method=post: credentials are sent in the request body, never in the URL */}
      <form action={action} className="mt-6 flex flex-col gap-3">
        <div className={`${num} text-[44px]`}>Pickleball Live</div>
        <p className={`mb-2 ${muted}`}>
          Sign in to score games or manage tournaments.
        </p>
        <label className={label}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={input}
          />
        </label>
        <label className={label}>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className={input}
          />
        </label>
        {state?.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="text-sm">
            {state.message}
          </p>
        )}
        <button name="intent" value="signin" disabled={pending} className={btn}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <button
          name="intent"
          value="signup"
          disabled={pending}
          className={btn2}
        >
          Create account
        </button>
        <Link
          href="/"
          className="py-3 text-center font-bold text-[color:var(--link)]"
        >
          Just watching? View live scores
        </Link>
      </form>
    </div>
  );
}
