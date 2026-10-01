import type { LiveMotivationItem, LiveMotivationShown } from "./live-motivation-data";

/**
 * Cooldown period in days — previously shown items are excluded for this long.
 */
const SHOWN_COOLDOWN_DAYS = 30;

/**
 * Calculate days between two date strings (YYYY-MM-DD).
 */
function daysBetween(earlier: string, later: string): number {
  const earlierDate = new Date(`${earlier}T12:00:00Z`);
  const laterDate = new Date(`${later}T12:00:00Z`);
  return Math.floor((laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Select a live motivation item for today.
 *
 * Selection priority:
 * 1. Never-shown items (highest priority)
 * 2. Previously shown items whose cooldown has expired (oldest shown first)
 *
 * During the cooldown period, previously shown items are excluded.
 * If no items are eligible, returns null (caller falls back to personal library).
 *
 * Pure function — safe for client components.
 */
export function selectDailyLiveMotivation(
  items: LiveMotivationItem[],
  shownHistory: LiveMotivationShown[],
  today: string
): LiveMotivationItem | null {
  const activeItems = items.filter((item) => item.isActive);
  if (activeItems.length === 0) return null;

  // Build map of item ID to most recent shown date
  const lastShownMap = new Map<string, string>();
  for (const shown of shownHistory) {
    const existing = lastShownMap.get(shown.liveItemId);
    if (!existing || shown.shownOn > existing) {
      lastShownMap.set(shown.liveItemId, shown.shownOn);
    }
  }

  // Partition items into never-shown and eligible-after-cooldown
  const neverShown: LiveMotivationItem[] = [];
  const eligibleAfterCooldown: Array<{ item: LiveMotivationItem; lastShown: string }> = [];

  for (const item of activeItems) {
    const lastShown = lastShownMap.get(item.id);
    if (!lastShown) {
      neverShown.push(item);
    } else {
      const daysSinceShown = daysBetween(lastShown, today);
      if (daysSinceShown >= SHOWN_COOLDOWN_DAYS) {
        eligibleAfterCooldown.push({ item, lastShown });
      }
    }
  }

  // Prefer never-shown items
  if (neverShown.length > 0) {
    return selectDeterministic(neverShown, today);
  }

  // Then prefer eligible-after-cooldown items, oldest shown first
  if (eligibleAfterCooldown.length > 0) {
    // Sort by lastShown ascending (oldest first) to prefer items not shown recently
    eligibleAfterCooldown.sort((a, b) => a.lastShown.localeCompare(b.lastShown));
    return selectDeterministic(
      eligibleAfterCooldown.map((e) => e.item),
      today
    );
  }

  // No eligible items — all are within cooldown period
  return null;
}

/**
 * Deterministic selection from a pool based on date hash.
 * Same date + same pool = same selection.
 */
function selectDeterministic(pool: LiveMotivationItem[], today: string): LiveMotivationItem {
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

/**
 * Check if cache is stale (older than 24 hours).
 *
 * Pure function — safe for client components.
 */
export function isCacheStale(lastFetchedAt: string | null): boolean {
  if (!lastFetchedAt) return true;
  const elapsed = Date.now() - new Date(lastFetchedAt).getTime();
  return elapsed > 24 * 60 * 60 * 1000;
}
