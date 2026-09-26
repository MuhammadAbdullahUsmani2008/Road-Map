import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedUserId } from "./config";
import { DEVICE_COOKIE_NAME, validateDeviceCredential } from "./device";
import { createClient } from "@/lib/supabase/server";

export type AccessContext = {
  supabase: SupabaseClient;
  userId: string;
  deviceId: string | null;
};

export async function getAuthorizedAccess(options: { requireDevice?: boolean } = {}): Promise<AccessContext | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || userId !== getAuthorizedUserId()) return null;

  if (options.requireDevice === false) return { supabase, userId, deviceId: null };
  const cookieStore = await cookies();
  const deviceId = await validateDeviceCredential(supabase, userId, cookieStore.get(DEVICE_COOKIE_NAME)?.value);
  return deviceId ? { supabase, userId, deviceId } : null;
}