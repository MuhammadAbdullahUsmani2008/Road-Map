"use client";

import { useState, useTransition } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";

export function LoginForm({ nextPath, initialError }: { nextPath?: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError === "unauthorized" ? "This account is not authorized for USMANI OS." : null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) {
          setError(signInError.message.toLowerCase().includes("invalid") ? "The email or password is incorrect." : "We could not reach your private workspace. Please try again.");
          return;
        }
        router.replace(safeRedirectPath(nextPath));
        router.refresh();
      } catch {
        setError("We could not reach your private workspace. Please try again.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--primary)]" aria-hidden="true" />
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-bold tracking-[0.16em] text-white shadow-[0_10px_24px_var(--primary-shadow)]">U</span>
          <div><p className="text-sm font-bold tracking-[0.16em]">USMANI OS</p><p className="mt-1 text-xs text-[var(--muted)]">Private execution system</p></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-tint)] text-[var(--primary)]"><LockKeyhole size={21} aria-hidden="true" /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Private access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Enter the command center.</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in with your approved USMANI OS account. New browsers also need explicit device approval.</p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" /></label>
            <label className="block text-sm font-semibold">Password<div className="relative mt-2"><input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 pr-12 text-sm font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error ? <p className="flex items-start gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-sm leading-5 text-[var(--danger)]" role="alert"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Checking access..." : "Sign in"}<ArrowRight size={17} /></Button>
          </form>
          <p className="mt-6 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-xs leading-5 text-[var(--muted)]"><ShieldCheck size={16} className="shrink-0 text-[var(--success)]" />Access is limited to your authorized account and approved devices.</p>
        </div>
      </section>
    </main>
  );
}