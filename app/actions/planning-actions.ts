"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { monthStartFor, weekStartFor } from "@/lib/dates";

type ActionResult = { ok: true } | { ok: false; error: string };

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

function todayInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function currentUserToday() {
  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { supabase, userId, today: null as string | null };
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  return { supabase, userId, today: todayInTimezone(profile?.timezone || "UTC") };
}

// ---- Monthly plan objective (reuses roadmap_months.objective) ----

export async function saveMonthObjectiveAction(input: { monthId: string; objective?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing your plan." };
  const objective = cleanText(input.objective, 500);
  if (!objective.ok) return objective;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.monthId)) return { ok: false, error: "That month could not be identified." };
  const { error } = await access.supabase.from("roadmap_months").update({ objective: objective.value }).eq("id", input.monthId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The monthly objective could not be saved. Please try again." };
  revalidatePath("/planning");
  revalidatePath("/planning/month");
  revalidatePath("/");
  return { ok: true };
}

// ---- Weekly plan objective (reuses roadmap_weeks.objective) ----

export async function saveWeekObjectiveAction(input: { weekId: string; objective?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing your plan." };
  const objective = cleanText(input.objective, 500);
  if (!objective.ok) return objective;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.weekId)) return { ok: false, error: "That week could not be identified." };
  const { error } = await access.supabase.from("roadmap_weeks").update({ objective: objective.value }).eq("id", input.weekId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The weekly objective could not be saved. Please try again." };
  revalidatePath("/planning");
  revalidatePath("/planning/week");
  revalidatePath("/");
  return { ok: true };
}

// ---- Daily report (reuses daily_reports) ----

export async function saveDailyReportAction(input: { reportDate?: string; wins?: string; blockers?: string; energy?: string }): Promise<ActionResult> {
  const { supabase, userId, today } = await currentUserToday();
  if (!supabase || !userId || !today) return { ok: false, error: "Please sign in before writing your report." };

  const reportDate = input.reportDate || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return { ok: false, error: "Choose a valid report date." };

  const wins = cleanText(input.wins, 2000);
  if (!wins.ok) return wins;
  const blockers = cleanText(input.blockers, 2000);
  if (!blockers.ok) return blockers;

  let energy: number | null = null;
  if (input.energy !== undefined && input.energy !== "") {
    const parsed = Number(input.energy);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) return { ok: false, error: "Energy must be between 1 and 10." };
    energy = parsed;
  }

  const { error } = await supabase.from("daily_reports").upsert({ user_id: userId, report_date: reportDate, wins: wins.value, blockers: blockers.value, energy }, { onConflict: "user_id,report_date" });
  if (error) return { ok: false, error: "Your report could not be saved. Please try again." };
  revalidatePath("/reports");
  revalidatePath("/reports/daily");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

// ---- Weekly review (reuses weekly_reviews) ----

export async function saveWeeklyReviewAction(input: { weekStart?: string; summary?: string; lessons?: string; nextFocus?: string }): Promise<ActionResult> {
  const { supabase, userId, today } = await currentUserToday();
  if (!supabase || !userId || !today) return { ok: false, error: "Please sign in before writing your review." };

  const weekStart = input.weekStart || weekStartFor(today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return { ok: false, error: "Choose a valid week." };

  const summary = cleanText(input.summary, 2000);
  if (!summary.ok) return summary;
  const lessons = cleanText(input.lessons, 2000);
  if (!lessons.ok) return lessons;
  const nextFocus = cleanText(input.nextFocus, 2000);
  if (!nextFocus.ok) return nextFocus;

  const { error } = await supabase.from("weekly_reviews").upsert({ user_id: userId, week_start: weekStart, summary: summary.value, lessons: lessons.value, next_focus: nextFocus.value }, { onConflict: "user_id,week_start" });
  if (error) return { ok: false, error: "Your weekly review could not be saved. Please try again." };
  revalidatePath("/reports");
  revalidatePath("/reports/weekly");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

// ---- Monthly review (new monthly_reviews table) ----

export async function saveMonthlyReviewAction(input: { monthStart?: string; wins?: string; misses?: string; blockers?: string; lessons?: string; nextObjective?: string }): Promise<ActionResult> {
  const { supabase, userId, today } = await currentUserToday();
  if (!supabase || !userId || !today) return { ok: false, error: "Please sign in before writing your review." };

  const monthStart = input.monthStart || monthStartFor(today);
  if (!/^\d{4}-\d{2}-01$/.test(monthStart)) return { ok: false, error: "Choose a valid month." };

  const wins = cleanText(input.wins, 2000);
  if (!wins.ok) return wins;
  const misses = cleanText(input.misses, 2000);
  if (!misses.ok) return misses;
  const blockers = cleanText(input.blockers, 2000);
  if (!blockers.ok) return blockers;
  const lessons = cleanText(input.lessons, 2000);
  if (!lessons.ok) return lessons;
  const nextObjective = cleanText(input.nextObjective, 500);
  if (!nextObjective.ok) return nextObjective;

  const { error } = await supabase.from("monthly_reviews").upsert({ user_id: userId, month_start: monthStart, wins: wins.value, misses: misses.value, blockers: blockers.value, lessons: lessons.value, next_objective: nextObjective.value }, { onConflict: "user_id,month_start" });
  if (error) return { ok: false, error: "Your monthly review could not be saved. Please try again." };
  revalidatePath("/reports");
  revalidatePath("/reports/monthly");
  revalidatePath("/");
  return { ok: true };
}
