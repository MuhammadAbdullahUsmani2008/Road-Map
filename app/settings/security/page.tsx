import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { SecurityDevices } from "@/components/auth/security-devices";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/app-shell";

type DeviceRow = { id: string; device_name: string; device_type: "laptop" | "phone" | "other"; created_at: string; last_seen_at: string };

export default async function SecuritySettingsPage() {
  const access = await getAuthorizedAccess();
  if (!access) redirect("/login");
  const { data } = await access.supabase.from("user_devices").select("id, device_name, device_type, created_at, last_seen_at").eq("user_id", access.userId).is("revoked_at", null).order("created_at", { ascending: true });
  const devices = ((data ?? []) as DeviceRow[]).map((device) => ({ ...device, current: device.id === access.deviceId }));
  return <AppShell><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="flex items-start gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-tint)] text-[var(--success)]"><ShieldCheck size={21} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--success)]">Security</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">Approved devices</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Only explicitly approved browsers can enter your private workspace. Two device slots are available.</p></div></div><section className="mt-8" aria-labelledby="devices-heading"><div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4"><div><h2 id="devices-heading" className="text-xl font-semibold">Your devices</h2><p className="mt-1 text-sm text-[var(--muted)]">Credentials are never displayed or stored in readable form.</p></div><span className="text-sm font-semibold text-[var(--primary)]">{devices.length} / 2</span></div><SecurityDevices devices={devices} /></section><section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Future readiness</p><h2 className="mt-2 text-lg font-semibold">MFA-ready architecture</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Session identity and device authorization are separate layers, leaving room to add Supabase MFA without changing device credentials.</p></section></div></AppShell>;
}