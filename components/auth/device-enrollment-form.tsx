"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Check, Laptop, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { authorizeDeviceAction } from "@/app/actions/auth-actions";
import { safeRedirectPath } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";

export function DeviceEnrollmentForm({ nextPath, activeCount }: { nextPath?: string; activeCount: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"laptop" | "phone">("laptop");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await authorizeDeviceAction({ deviceName: name, deviceType: type, nextPath });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(safeRedirectPath(nextPath));
      router.refresh();
    });
  }

  return <form className="mt-7 space-y-5" onSubmit={submit}>
    <label className="block text-sm font-semibold">Device name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="My Laptop" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" /></label>
    <fieldset><legend className="text-sm font-semibold">Device type</legend><div className="mt-2 grid grid-cols-2 gap-3"><label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${type === "laptop" ? "border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]" : "border-[var(--line)] text-[var(--muted)]"}`}><input type="radio" name="device-type" value="laptop" checked={type === "laptop"} onChange={() => setType("laptop")} className="sr-only" /><Laptop size={18} />Laptop</label><label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${type === "phone" ? "border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]" : "border-[var(--line)] text-[var(--muted)]"}`}><input type="radio" name="device-type" value="phone" checked={type === "phone"} onChange={() => setType("phone")} className="sr-only" /><Smartphone size={18} />Phone</label></div></fieldset>
    {error ? <p className="flex items-start gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-sm leading-5 text-[var(--danger)]" role="alert"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p> : null}
    <Button type="submit" className="w-full" disabled={pending || activeCount >= 2}>{pending ? "Approving device..." : "Authorize this device"}<Check size={17} /></Button>
  </form>;
}