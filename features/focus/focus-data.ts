import { getAuthorizedAccess } from "@/lib/auth/server";
import type { Commitment } from "@/features/motivation/motivation-data";
import { getLiveMotivationData, markLiveMotivationShown, selectDailyLiveMotivation, type LiveMotivationItem } from "@/features/motivation/live-motivation-data";

export type FocusTask = { id: string; title: string; description: string | null; estimatedMinutes: number | null; status: string };
export type FocusSession = { id: string; taskId: string | null; startedAt: string; activeStartedAt: string | null; pausedAt: string | null; endedAt: string | null; durationSeconds: number; status: "active" | "paused" | "completed" | "abandoned" };
export type FocusData = { authenticated: boolean; task: FocusTask | null; session: FocusSession | null; error: string | null; activeCommitment: Commitment | null; liveMotivation: LiveMotivationItem | null };

export async function getFocusData(taskId: string | undefined): Promise<FocusData> {
  const access = await getAuthorizedAccess();
  if (!access) return { authenticated: false, task: null, session: null, error: null, activeCommitment: null, liveMotivation: null };
  const { supabase, userId } = access;

  let task: FocusTask | null = null;
  if (taskId) {
    const { data, error } = await supabase.from("tasks").select("id, title, description, estimated_minutes, status").eq("id", taskId).eq("user_id", userId).maybeSingle();
    if (error) return { authenticated: true, task: null, session: null, error: "We could not load that task.", activeCommitment: null, liveMotivation: null };
    if (!data) return { authenticated: true, task: null, session: null, error: "That task was not found in your workspace.", activeCommitment: null, liveMotivation: null };
    task = { id: data.id, title: data.title, description: data.description, estimatedMinutes: data.estimated_minutes, status: data.status };
  }

  const { data: activeSession, error: sessionError } = await supabase.from("focus_sessions").select("id, task_id, started_at, active_started_at, paused_at, ended_at, duration_seconds, status").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (sessionError) return { authenticated: true, task, session: null, error: "We could not load your focus session.", activeCommitment: null, liveMotivation: null };
  if (activeSession?.task_id && taskId && activeSession.task_id !== taskId) return { authenticated: true, task, session: null, error: "Another focus session is already active. Finish or exit it before starting a different task.", activeCommitment: null, liveMotivation: null };
  const session = activeSession ? { id: activeSession.id, taskId: activeSession.task_id, startedAt: activeSession.started_at, activeStartedAt: activeSession.active_started_at, pausedAt: activeSession.paused_at, endedAt: activeSession.ended_at, durationSeconds: activeSession.duration_seconds, status: activeSession.status } as FocusSession : null;

  // Fetch active commitment for focus context
  const { data: commitments } = await supabase.from("commitments").select("id, title, description, cadence, status, created_at, updated_at").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1);
  const activeCommitment = commitments && commitments.length > 0 ? {
    id: commitments[0].id,
    title: commitments[0].title,
    description: commitments[0].description,
    cadence: commitments[0].cadence as Commitment["cadence"],
    status: commitments[0].status as Commitment["status"],
    createdAt: commitments[0].created_at,
    updatedAt: commitments[0].updated_at,
  } : null;

  // Fetch live motivation for focus context
  const liveMotivationData = await getLiveMotivationData();
  const today = new Date().toISOString().slice(0, 10);
  const liveMotivation = liveMotivationData.authenticated && !liveMotivationData.error
    ? selectDailyLiveMotivation(liveMotivationData.items, liveMotivationData.shownHistory, today)
    : null;

  // Record shown history when a live motivation item is actually selected
  if (liveMotivation) {
    markLiveMotivationShown(liveMotivation.id, today).catch(() => {
      // Silently fail — shown history is best-effort
    });
  }

  return { authenticated: true, task, session, error: null, activeCommitment, liveMotivation };
}
