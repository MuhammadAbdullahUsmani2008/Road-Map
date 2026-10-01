"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { fetchAndStoreLiveMotivation, markLiveMotivationShown } from "@/features/motivation/live-motivation-data";

type ActionResult = { ok: true; newItems?: number } | { ok: false; error: string };

/**
 * Fetch new live motivation from external sources.
 * Server-side only. Validates, deduplicates, and stores new items.
 */
export async function refreshLiveMotivationAction(): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before refreshing live motivation." };

  const result = await fetchAndStoreLiveMotivation();
  if (!result.ok) return { ok: false, error: result.error || "Failed to refresh live motivation." };

  revalidatePath("/motivation");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true, newItems: result.newItems };
}

/**
 * Mark a live motivation item as shown today.
 */
export async function markLiveMotivationShownAction(itemId: string, today: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in." };

  const result = await markLiveMotivationShown(itemId, today);
  if (!result.ok) return { ok: false, error: result.error || "Failed to mark as shown." };

  return { ok: true };
}
