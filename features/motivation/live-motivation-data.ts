import { createHash } from "crypto";
import { getAuthorizedAccess } from "@/lib/auth/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export type LiveMotivationItem = {
  id: string;
  content: string;
  source: string;
  sourceUrl: string | null;
  author: string | null;
  externalId: string | null;
  contentHash: string;
  publishedAt: string | null;
  fetchedAt: string;
  isActive: boolean;
};

export type LiveMotivationShown = {
  id: string;
  liveItemId: string;
  shownOn: string;
};

export type LiveMotivationData = {
  authenticated: boolean;
  error: string | null;
  items: LiveMotivationItem[];
  shownHistory: LiveMotivationShown[];
  lastFetchedAt: string | null;
};

// ─── Source Adapters ────────────────────────────────────────────────────────

type RawExternalItem = {
  content: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  externalId?: string;
  publishedAt?: string;
};

/**
 * Fetch from Zen Quotes API — free, no key required, stable public API.
 * Returns inspirational quotes with attribution.
 */
async function fetchZenQuotes(): Promise<RawExternalItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("https://zenquotes.io/api/quotes", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => {
        const q = typeof item.q === "string" ? item.q.trim() : "";
        const a = typeof item.a === "string" ? item.a.trim() : "";
        const h = typeof item.h === "string" ? item.h.trim() : "";
        return {
          content: q,
          source: "Zen Quotes",
          sourceUrl: h || undefined,
          author: a || undefined,
          externalId: undefined,
          publishedAt: undefined,
        };
      })
      .filter((item) => item.content.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Content Validation ─────────────────────────────────────────────────────

function isValidContent(content: string): boolean {
  if (!content || content.trim().length === 0) return false;
  if (content.length > 500) return false;

  // Reject obvious spam/promotional patterns
  const spamPatterns = [
    /buy now/i,
    /click here/i,
    /limited time/i,
    /act now/i,
    /\$\$\$/,
    /!!!{3,}/,
  ];
  if (spamPatterns.some((pattern) => pattern.test(content))) return false;

  return true;
}

// ─── Hash / Deduplication ───────────────────────────────────────────────────

function computeContentHash(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

// ─── Database Operations ────────────────────────────────────────────────────

type LiveItemRow = {
  id: string;
  content: string;
  source: string;
  source_url: string | null;
  author: string | null;
  external_id: string | null;
  content_hash: string;
  published_at: string | null;
  fetched_at: string;
  is_active: boolean;
};

type ShownRow = {
  id: string;
  live_item_id: string;
  shown_on: string;
};

function mapRowToItem(row: LiveItemRow): LiveMotivationItem {
  return {
    id: row.id,
    content: row.content,
    source: row.source,
    sourceUrl: row.source_url,
    author: row.author,
    externalId: row.external_id,
    contentHash: row.content_hash,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    isActive: row.is_active,
  };
}

function mapRowToShown(row: ShownRow): LiveMotivationShown {
  return {
    id: row.id,
    liveItemId: row.live_item_id,
    shownOn: row.shown_on,
  };
}

// ─── Main Data Functions ────────────────────────────────────────────────────

const CACHE_STALE_HOURS = 24;
const MAX_STORED_ITEMS = 500;
const MAX_FETCH_ITEMS = 10;

export async function getLiveMotivationData(): Promise<LiveMotivationData> {
  const access = await getAuthorizedAccess();
  if (!access) return { authenticated: false, error: null, items: [], shownHistory: [], lastFetchedAt: null };
  const { supabase, userId } = access;

  // Fetch existing cached items and shown history
  const [itemsResult, shownResult] = await Promise.all([
    supabase.from("live_motivation_items").select("id, content, source, source_url, author, external_id, content_hash, published_at, fetched_at, is_active").eq("user_id", userId).order("fetched_at", { ascending: false }).limit(MAX_STORED_ITEMS),
    supabase.from("live_motivation_shown").select("id, live_item_id, shown_on").eq("user_id", userId).order("shown_on", { ascending: false }).limit(2000),
  ]);

  if (itemsResult.error) return { authenticated: true, error: "We could not load live motivation data.", items: [], shownHistory: [], lastFetchedAt: null };
  if (shownResult.error) return { authenticated: true, error: "We could not load shown history.", items: [], shownHistory: [], lastFetchedAt: null };

  const items = (itemsResult.data ?? []).map(mapRowToItem);
  const shownHistory = (shownResult.data ?? []).map(mapRowToShown);
  const lastFetchedAt = items.length > 0 ? items[0].fetchedAt : null;

  return { authenticated: true, error: null, items, shownHistory, lastFetchedAt };
}

/**
 * Fetch new live motivation from external sources, validate, deduplicate, and store.
 * Returns the number of new items stored.
 */
export async function fetchAndStoreLiveMotivation(): Promise<{ ok: boolean; newItems: number; error: string | null }> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, newItems: 0, error: "Please sign in." };
  const { supabase, userId } = access;

  // Fetch from all approved sources
  const rawItems = await fetchZenQuotes();

  // Validate
  const validItems = rawItems.filter((item) => isValidContent(item.content));
  if (validItems.length === 0) return { ok: true, newItems: 0, error: null };

  // Get existing hashes for deduplication
  const { data: existingItems } = await supabase.from("live_motivation_items").select("content_hash").eq("user_id", userId);
  const existingHashes = new Set((existingItems ?? []).map((row) => row.content_hash));

  // Filter out duplicates
  const newItems = validItems
    .filter((item) => !existingHashes.has(computeContentHash(item.content)))
    .slice(0, MAX_FETCH_ITEMS);

  if (newItems.length === 0) return { ok: true, newItems: 0, error: null };

  // Store new items
  const rows = newItems.map((item) => ({
    user_id: userId,
    content: item.content,
    source: item.source,
    source_url: item.sourceUrl || null,
    author: item.author || null,
    external_id: item.externalId || null,
    content_hash: computeContentHash(item.content),
    published_at: item.publishedAt || null,
    is_active: true,
  }));

  const { error } = await supabase.from("live_motivation_items").insert(rows);
  if (error) return { ok: false, newItems: 0, error: "Failed to store live motivation items." };

  return { ok: true, newItems: newItems.length, error: null };
}

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
 * Deterministic selection from a pool based on date hash.
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
 * Select a live motivation item for today.
 *
 * Selection priority:
 * 1. Never-shown items (highest priority)
 * 2. Previously shown items whose cooldown has expired (oldest shown first)
 *
 * During the cooldown period, previously shown items are excluded.
 * If no items are eligible, returns null (caller falls back to personal library).
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
 * Mark a live motivation item as shown today.
 */
export async function markLiveMotivationShown(itemId: string, today: string): Promise<{ ok: boolean; error: string | null }> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in." };
  const { supabase, userId } = access;

  const { error } = await supabase.from("live_motivation_shown").insert({
    user_id: userId,
    live_item_id: itemId,
    shown_on: today,
  });

  if (error) return { ok: false, error: "Failed to record shown history." };
  return { ok: true, error: null };
}

/**
 * Check if cache is stale (older than CACHE_STALE_HOURS).
 */
export function isCacheStale(lastFetchedAt: string | null): boolean {
  if (!lastFetchedAt) return true;
  const elapsed = Date.now() - new Date(lastFetchedAt).getTime();
  return elapsed > CACHE_STALE_HOURS * 60 * 60 * 1000;
}

/**
 * Clean up old items beyond MAX_STORED_ITEMS to prevent unbounded growth.
 */
export async function cleanupOldLiveMotivation(): Promise<void> {
  const access = await getAuthorizedAccess();
  if (!access) return;
  const { supabase, userId } = access;

  // Keep only the most recent MAX_STORED_ITEMS
  const { data: items } = await supabase
    .from("live_motivation_items")
    .select("id")
    .eq("user_id", userId)
    .order("fetched_at", { ascending: false })
    .limit(MAX_STORED_ITEMS + 1);

  if (items && items.length > MAX_STORED_ITEMS) {
    const idsToDelete = items.slice(MAX_STORED_ITEMS).map((item) => item.id);
    await supabase.from("live_motivation_items").delete().in("id", idsToDelete);
  }
}
