import { getAuthorizedAccess } from "@/lib/auth/server";
import { getLiveMotivationData, type LiveMotivationData } from "./live-motivation-data";

export type MotivationItem = {
  id: string;
  title: string;
  content: string | null;
  kind: "note" | "principle" | "reminder" | "recovery";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Commitment = {
  id: string;
  title: string;
  description: string | null;
  cadence: "daily" | "weekly" | "monthly" | "one_time";
  status: "active" | "paused" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type MotivationData = {
  authenticated: boolean;
  error: string | null;
  items: MotivationItem[];
  commitments: Commitment[];
  liveMotivation: LiveMotivationData;
};

type MotivationRow = {
  id: string;
  title: string;
  content: string | null;
  kind: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CommitmentRow = {
  id: string;
  title: string;
  description: string | null;
  cadence: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getMotivationData(): Promise<MotivationData> {
  const access = await getAuthorizedAccess();
  if (!access) return { authenticated: false, error: null, items: [], commitments: [], liveMotivation: { authenticated: false, error: null, items: [], shownHistory: [], lastFetchedAt: null } };
  const { supabase, userId } = access;

  const [itemsResult, commitmentsResult, liveMotivation] = await Promise.all([
    supabase.from("motivation_items").select("id, title, content, kind, is_active, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("commitments").select("id, title, description, cadence, status, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    getLiveMotivationData(),
  ]);

  if (itemsResult.error) return { authenticated: true, error: "We could not load your motivation items. Please try again.", items: [], commitments: [], liveMotivation };
  if (commitmentsResult.error) return { authenticated: true, error: "We could not load your commitments. Please try again.", items: [], commitments: [], liveMotivation };

  const items: MotivationItem[] = ((itemsResult.data ?? []) as MotivationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    kind: row.kind as MotivationItem["kind"],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const commitments: Commitment[] = ((commitmentsResult.data ?? []) as CommitmentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    cadence: row.cadence as Commitment["cadence"],
    status: row.status as Commitment["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { authenticated: true, error: null, items, commitments, liveMotivation };
}

/**
 * Deterministically select one active motivation item for today.
 * Uses a stable hash of the date + item IDs so the same item is shown
 * throughout the day but rotates across days.
 */
export function getDailyMotivation(items: MotivationItem[], today: string): MotivationItem | null {
  const active = items.filter((item) => item.isActive);
  if (active.length === 0) return null;

  // Simple deterministic hash of the date string
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % active.length;
  return active[index];
}

/**
 * Get the current active commitment (most recently created active one).
 */
export function getActiveCommitment(commitments: Commitment[]): Commitment | null {
  return commitments.find((c) => c.status === "active") ?? null;
}

/**
 * Get active recovery items for recovery mode.
 */
export function getRecoveryItems(items: MotivationItem[]): MotivationItem[] {
  return items.filter((item) => item.isActive && item.kind === "recovery");
}
