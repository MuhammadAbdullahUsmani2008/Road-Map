import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function SettingsPage() {
  if (!(await getAuthorizedAccess())) redirect("/login");
  return <AppShell><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Workspace settings</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">Settings</h1><p className="mt-3 text-base text-[var(--muted)]">Keep the system private, deliberate, and ready for the next session.</p><section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-start gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-tint)] text-[var(--primary)]"><ShieldCheck size={19} /></div><div><h2 className="text-lg font-semibold">Security</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Manage approved devices and review your private access posture.</p><Link href="/settings/security" className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open security settings<ArrowRight size={16} /></Link></div></div></section><LogoutButton /></div></AppShell>;
}