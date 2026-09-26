import { createClient } from "@/lib/supabase/server";
import { getAuthorizedAccess } from "@/lib/auth/server";

export type TaskInput = {
  title: string;
  description?: string;
  priority?: number;
  dueOn?: string;
  estimatedMinutes?: number;
  roadmapWeekId?: string;
};

type OperationResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanInput(input: TaskInput) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "A task title is required." };
  if (title.length > 160) return { ok: false as const, error: "Task titles must be 160 characters or fewer." };
  const priority = input.priority ?? 3;
  if (![1, 2, 3, 4, 5].includes(priority)) return { ok: false as const, error: "Choose a valid priority." };
  const estimatedMinutes = input.estimatedMinutes;
  if (estimatedMinutes !== undefined && (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440)) return { ok: false as const, error: "Estimated time must be between 1 and 1440 minutes." };
  if (input.roadmapWeekId && !validId(input.roadmapWeekId)) return { ok: false as const, error: "That roadmap week is not valid." };
  return { ok: true as const, value: { title, description: input.description?.trim() || null, priority, due_on: input.dueOn || null, estimated_minutes: estimatedMinutes ?? null, roadmap_week_id: input.roadmapWeekId || null } };
}

async function currentUser() {
  const access = await getAuthorizedAccess();
  return access ?? { supabase: await createClient(), userId: null };
}

export async function createTaskForCurrentUser(input: TaskInput): Promise<OperationResult<{ id: string }>> {
  const clean = cleanInput(input);
  if (!clean.ok) return clean;
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Please sign in before creating tasks." };
  const { data, error } = await supabase.from("tasks").insert({ user_id: userId, ...clean.value, status: clean.value.due_on ? "planned" : "inbox" }).select("id").single();
  if (error) return { ok: false, error: "The task could not be created. Please try again." };
  return { ok: true, data: { id: data.id } };
}

export async function updateTaskForCurrentUser(taskId: string, input: TaskInput): Promise<OperationResult> {
  const clean = cleanInput(input);
  if (!clean.ok) return clean;
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Please sign in before editing tasks." };
  const { error } = await supabase.from("tasks").update(clean.value).eq("id", taskId).eq("user_id", userId);
  if (error) return { ok: false, error: "The task could not be updated. Please try again." };
  return { ok: true };
}

export async function deleteTaskForCurrentUser(taskId: string): Promise<OperationResult> {
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Please sign in before deleting tasks." };
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
  if (error) return { ok: false, error: "The task could not be deleted. Please try again." };
  return { ok: true };
}

export async function completeTaskForCurrentUser(taskId: string, completedOn: string): Promise<OperationResult> {
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Please sign in before updating tasks." };
  const { error: completionError } = await supabase.from("task_completions").upsert({ user_id: userId, task_id: taskId, completed_on: completedOn }, { onConflict: "user_id,task_id,completed_on" });
  if (completionError) return { ok: false, error: "The task could not be marked complete. Please try again." };
  const { error: taskError } = await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", taskId).eq("user_id", userId);
  if (taskError) return { ok: false, error: "The completion was recorded, but the task status could not be updated." };
  return { ok: true };
}

export async function reopenTaskForCurrentUser(taskId: string, completedOn: string): Promise<OperationResult> {
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };
  const { supabase, userId } = await currentUser();
  if (!userId) return { ok: false, error: "Please sign in before updating tasks." };
  const { error: completionError } = await supabase.from("task_completions").delete().eq("user_id", userId).eq("task_id", taskId).eq("completed_on", completedOn);
  if (completionError) return { ok: false, error: "The task could not be reopened. Please try again." };
  const { error: taskError } = await supabase.from("tasks").update({ status: "planned", completed_at: null }).eq("id", taskId).eq("user_id", userId);
  if (taskError) return { ok: false, error: "The task history was updated, but the task could not be reopened." };
  return { ok: true };
}

export { validId };
