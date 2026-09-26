import { Laptop, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { DeviceEnrollmentForm } from "@/components/auth/device-enrollment-form";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { safeRedirectPath } from "@/lib/auth/config";

type DeviceAuthorizePageProps = { searchParams: Promise<{ next?: string }> };

export default async function DeviceAuthorizePage({ searchParams }: DeviceAuthorizePageProps) {
  const access = await getAuthorizedAccess({ requireDevice: false });
  if (!access) redirect("/login");
  const params = await searchParams;
  const { count } = await access.supabase.from("user_devices").select("id", { count: "exact", head: true }).eq("user_id", access.userId).is("revoked_at", null);
  const activeCount = count ?? 0;

  return <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-5 py-10 text-[var(--ink)] sm:px-8"><section className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-tint)] text-[var(--primary)]"><Laptop size={23} /></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">New device detected</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Authorize this browser.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">USMANI OS allows two approved devices. This browser will receive a private device credential stored in a secure cookie.</p><div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--success-tint)] p-3 text-xs leading-5 text-[var(--success)]"><ShieldCheck size={17} className="shrink-0" />{activeCount} of 2 approved device slots are in use.</div>{activeCount < 2 ? <DeviceEnrollmentForm nextPath={safeRedirectPath(params.next)} activeCount={activeCount} /> : <p className="mt-6 rounded-xl bg-[var(--warning-tint)] p-4 text-sm leading-6 text-[var(--warning)]">Both device slots are in use. Sign in from an approved device and revoke one before authorizing this browser.</p>}</section></main>;
}