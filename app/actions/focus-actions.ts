"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { completeTaskForCurrentUser, validId } from "@/lib/tasks/task-operations";

type FocusResult = { ok: true; sessionId?: string; durationSeconds?: number } | { ok: false; error: string };

async function getSessionContext(sessionId: string) {
  if (!validId(sessionId)) return { ok: false as const, error: "That focus session is not valid." };
  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { ok: false as const, error: "Please sign in to use Focus Mode." };
  const { data: session, error } = await supabase.from("focus_sessions").select("id, user_id, task_id, started_at, active_started_at, duration_seconds, status").eq("id", sessionId).eq("user_id", userId).maybeSingle();
  if (error || !session) return { ok: false as const, error: "That focus session is no longer available." };
  return { ok: true as const, supabase, userId, session };
}

export async function startFocusAction(taskId: string): Promise<FocusResult> {
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };
  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { ok: false, error: "Please sign in to use Focus Mode." };
  const { data: task } = await supabase.from("tasks").select("id").eq("id", taskId).eq("user_id", userId).maybeSingle();
  if (!task) return { ok: false, error: "That task is not available in your workspace." };
  const { data: existing } = await supabase.from("focus_sessions").select("id, task_id").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.task_id && existing.task_id !== taskId) return { ok: false, error: "Another focus session is already active. Finish or exit it before starting a different task." };
  if (existing) return { ok: true, sessionId: existing.id };
  const now = new Date().toISOString();
  const { data: session, error } = await supabase.from("focus_sessions").insert({ user_id: userId, task_id: taskId, started_at: now, active_started_at: now, duration_seconds: 0, status: "active" }).select("id").single();
  if (error) return { ok: false, error: "The focus session could not be started. Please try again." };
  revalidatePath("/");
  return { ok: true, sessionId: session.id };
}

export async function pauseFocusAction(sessionId: string): Promise<FocusResult> {
  const context = await getSessionContext(sessionId);
  if (!context.ok) return context;
  if (context.session.status !== "active" || !context.session.active_started_at) return { ok: false, error: "This focus session is not active." };
  const durationSeconds = context.session.duration_seconds + Math.max(0, Math.floor((Date.now() - new Date(context.session.active_started_at).getTime()) / 1000));
  const { error } = await context.supabase.from("focus_sessions").update({ status: "paused", paused_at: new Date().toISOString(), active_started_at: null, duration_seconds: durationSeconds }).eq("id", sessionId).eq("user_id", context.userId);
  if (error) return { ok: false, error: "The focus session could not be paused." };
  return { ok: true, sessionId, durationSeconds };
}

export async function resumeFocusAction(sessionId: string): Promise<FocusResult> {
  const context = await getSessionContext(sessionId);
  if (!context.ok) return context;
  if (context.session.status !== "paused") return { ok: false, error: "This focus session is not paused." };
  const { error } = await context.supabase.from("focus_sessions").update({ status: "active", active_started_at: new Date().toISOString(), paused_at: null }).eq("id", sessionId).eq("user_id", context.userId);
  if (error) return { ok: false, error: "The focus session could not be resumed." };
  return { ok: true, sessionId, durationSeconds: context.session.duration_seconds };
}

export async function stopFocusAction(sessionId: string, completeTask: boolean): Promise<FocusResult> {
  const context = await getSessionContext(sessionId);
  if (!context.ok) return context;
  const now = new Date();
  const activeSeconds = context.session.status === "active" && context.session.active_started_at ? Math.max(0, Math.floor((now.getTime() - new Date(context.session.active_started_at).getTime()) / 1000)) : 0;
  const durationSeconds = context.session.duration_seconds + activeSeconds;

  if (completeTask && context.session.task_id) {
    const profile = await context.supabase.from("profiles").select("timezone").eq("id", context.userId).maybeSingle<{ timezone: string }>();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: profile.data?.timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const completedOn = `${values.year}-${values.month}-${values.day}`;
    const taskResult = await completeTaskForCurrentUser(context.session.task_id, completedOn);
    if (!taskResult.ok) return taskResult;
  }

  const { error } = await context.supabase.from("focus_sessions").update({ status: completeTask ? "completed" : "abandoned", ended_at: now.toISOString(), active_started_at: null, duration_seconds: durationSeconds }).eq("id", sessionId).eq("user_id", context.userId);
  if (error) return { ok: false, error: "The focus session could not be saved." };
  revalidatePath("/");
  return { ok: true, sessionId, durationSeconds };
}
