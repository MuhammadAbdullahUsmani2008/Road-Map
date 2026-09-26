import type { SupabaseClient } from "@supabase/supabase-js";

export const DEVICE_COOKIE_NAME = "usmani_device_credential";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

type DeviceHashRow = { id: string; credential_hash: string };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createDeviceCredential() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashDeviceCredential(credential: string) {
  const bytes = new TextEncoder().encode(credential);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  };
}

export async function validateDeviceCredential(supabase: SupabaseClient, userId: string, credential: string | undefined) {
  if (!credential) return null;
  const hash = await hashDeviceCredential(credential);
  const { data, error } = await supabase.from("user_devices").select("id, credential_hash").eq("user_id", userId).is("revoked_at", null) as { data: DeviceHashRow[] | null; error: unknown };
  if (error || !data) return null;

  const match = data.find((device) => constantTimeEqual(device.credential_hash, hash));
  if (!match) return null;
  await supabase.from("user_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", match.id).eq("user_id", userId);
  return match.id;
}