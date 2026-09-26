import { getAuthorizedAccess } from "@/lib/auth/server";

export type FocusTask = { id: string; title: string; description: string | null; estimatedMinutes: number | null; status: string };
export type FocusSession = { id: string; taskId: string | null; startedAt: string; activeStartedAt: string | null; pausedAt: string | null; endedAt: string | null; durationSeconds: number; status: "active" | "paused" | "completed" | "abandoned" };
export type FocusData = { authenticated: boolean; task: FocusTask | null; session: FocusSession | null; error: string | null };

export async function getFocusData(taskId: string | undefined): Promise<FocusData> {
  const access = await getAuthorizedAccess();
  if (!access) return { authenticated: false, task: null, session: null, error: null };
  const { supabase, userId } = access;

  let task: FocusTask | null = null;
  if (taskId) {
    const { data, error } = await supabase.from("tasks").select("id, title, description, estimated_minutes, status").eq("id", taskId).eq("user_id", userId).maybeSingle();
    if (error) return { authenticated: true, task: null, session: null, error: "We could not load that task." };
    if (!data) return { authenticated: true, task: null, session: null, error: "That task was not found in your workspace." };
    task = { id: data.id, title: data.title, description: data.description, estimatedMinutes: data.estimated_minutes, status: data.status };
  }

  const { data: activeSession, error: sessionError } = await supabase.from("focus_sessions").select("id, task_id, started_at, active_started_at, paused_at, ended_at, duration_seconds, status").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (sessionError) return { authenticated: true, task, session: null, error: "We could not load your focus session." };
  if (activeSession?.task_id && taskId && activeSession.task_id !== taskId) return { authenticated: true, task, session: null, error: "Another focus session is already active. Finish or exit it before starting a different task." };
  const session = activeSession ? { id: activeSession.id, taskId: activeSession.task_id, startedAt: activeSession.started_at, activeStartedAt: activeSession.active_started_at, pausedAt: activeSession.paused_at, endedAt: activeSession.ended_at, durationSeconds: activeSession.duration_seconds, status: activeSession.status } as FocusSession : null;
  return { authenticated: true, task, session, error: null };
}
