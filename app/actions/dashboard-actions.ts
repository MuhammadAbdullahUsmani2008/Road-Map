"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { completeTaskForCurrentUser, reopenTaskForCurrentUser, validId } from "@/lib/tasks/task-operations";

type DashboardActionResult = { ok: true } | { ok: false; error: string };

function todayInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function setDashboardTaskComplete(taskId: string, complete: boolean): Promise<DashboardActionResult> {
  if (!validId(taskId)) return { ok: false, error: "That task could not be identified." };

  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { ok: false, error: "Please sign in before updating tasks." };

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  const completedOn = todayInTimezone(profile?.timezone || "UTC");

  const result = complete ? await completeTaskForCurrentUser(taskId, completedOn) : await reopenTaskForCurrentUser(taskId, completedOn);
  if (!result.ok) return result;

  revalidatePath("/");
  return { ok: true };
}
