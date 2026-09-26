"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { completeTaskForCurrentUser, createTaskForCurrentUser, deleteTaskForCurrentUser, reopenTaskForCurrentUser, updateTaskForCurrentUser, type TaskInput } from "@/lib/tasks/task-operations";

function todayInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function currentUserToday() {
  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { supabase, today: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  return { supabase, today: todayInTimezone(profile?.timezone || "UTC") };
}

export async function createTaskAction(input: TaskInput) {
  const result = await createTaskForCurrentUser(input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function updateTaskAction(taskId: string, input: TaskInput) {
  const result = await updateTaskForCurrentUser(taskId, input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteTaskAction(taskId: string) {
  const result = await deleteTaskForCurrentUser(taskId);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function completeTaskAction(taskId: string) {
  const { today } = await currentUserToday();
  if (!today) return { ok: false as const, error: "Please sign in before updating tasks." };
  const result = await completeTaskForCurrentUser(taskId, today);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function reopenTaskAction(taskId: string) {
  const { today } = await currentUserToday();
  if (!today) return { ok: false as const, error: "Please sign in before updating tasks." };
  const result = await reopenTaskForCurrentUser(taskId, today);
  if (result.ok) revalidatePath("/");
  return result;
}
