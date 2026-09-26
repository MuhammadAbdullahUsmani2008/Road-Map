"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Laptop, Smartphone, Trash2 } from "lucide-react";
import { revokeDeviceAction } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";

type Device = { id: string; device_name: string; device_type: "laptop" | "phone" | "other"; created_at: string; last_seen_at: string; current: boolean };

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)); }

export function SecurityDevices({ devices }: { devices: Device[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  function revoke(id: string) {
    setError(null); setPendingId(id);
    startTransition(async () => { const result = await revokeDeviceAction(id); setPendingId(null); if (!result.ok) setError(result.error); else window.location.reload(); });
  }
  return <div className="mt-6 space-y-3">{error ? <p className="flex items-start gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]" role="alert"><AlertCircle size={17} />{error}</p> : null}{devices.map((device) => { const Icon = device.device_type === "phone" ? Smartphone : Laptop; return <article key={device.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-tint)] text-[var(--primary)]"><Icon size={18} /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{device.device_name}</h3>{device.current ? <span className="rounded-full bg-[var(--success-tint)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--success)]">Current device</span> : null}</div><p className="mt-1 text-xs text-[var(--muted)]">{device.device_type} · Added {formatDate(device.created_at)} · Last seen {formatDate(device.last_seen_at)}</p></div></div><Button type="button" variant="danger" disabled={device.current || pendingId === device.id} onClick={() => revoke(device.id)}><Trash2 size={16} />{pendingId === device.id ? "Revoking..." : "Revoke"}</Button></article>; })}</div>;
}