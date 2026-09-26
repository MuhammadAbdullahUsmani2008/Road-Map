"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { createDeviceCredential, deviceCookieOptions, hashDeviceCredential, DEVICE_COOKIE_NAME } from "@/lib/auth/device";

type DeviceType = "laptop" | "phone" | "other";
type ActionResult = { ok: true } | { ok: false; error: string };

function deviceType(value: string): DeviceType | null {
  return value === "laptop" || value === "phone" || value === "other" ? value : null;
}

export async function authorizeDeviceAction(input: { deviceName: string; deviceType: string; nextPath?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess({ requireDevice: false });
  if (!access) return { ok: false, error: "Your session is not authorized for this workspace." };

  const name = input.deviceName.trim();
  const type = deviceType(input.deviceType);
  if (!name || name.length > 80) return { ok: false, error: "Choose a device name between 1 and 80 characters." };
  if (!type || type === "other") return { ok: false, error: "Choose Laptop or Phone for this device." };

  const { count, error: countError } = await access.supabase.from("user_devices").select("id", { count: "exact", head: true }).eq("user_id", access.userId).is("revoked_at", null);
  if (countError) return { ok: false, error: "We could not check your approved devices. Please try again." };
  if ((count ?? 0) >= 2) return { ok: false, error: "Two devices are already approved. Revoke one before adding another." };

  const credential = createDeviceCredential();
  const credentialHash = await hashDeviceCredential(credential);
  const { error } = await access.supabase.from("user_devices").insert({ user_id: access.userId, device_name: name, device_type: type, credential_hash: credentialHash });
  if (error) return { ok: false, error: error.message.includes("maximum of two") ? "Two devices are already approved. Revoke one before adding another." : "This device could not be approved. Please try again." };

  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE_NAME, credential, deviceCookieOptions());
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function revokeDeviceAction(deviceId: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "This device is not authorized." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) return { ok: false, error: "That device could not be identified." };
  if (deviceId === access.deviceId) return { ok: false, error: "The current device cannot revoke itself." };

  const { data, error } = await access.supabase.from("user_devices").update({ revoked_at: new Date().toISOString() }).eq("id", deviceId).eq("user_id", access.userId).is("revoked_at", null).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "That device could not be revoked." };
  revalidatePath("/settings/security");
  return { ok: true };
}

export async function logoutAction() {
  const access = await getAuthorizedAccess({ requireDevice: false });
  if (access) {
    const { error } = await access.supabase.auth.signOut({ scope: "local" });
    if (error) return { ok: false as const, error: "We could not sign you out. Please try again." };
  }
  redirect("/login");
}