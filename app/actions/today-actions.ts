"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";

type ReportResult = { ok: true } | { ok: false; error: string };

function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

function cleanEnergy(value: string | undefined) {
  if (value === undefined || value === "") return { ok: true as const, value: null as number | null };
  const energy = Number(value);
  if (!Number.isInteger(energy) || energy < 1 || energy > 10) return { ok: false as const, error: "Energy must be between 1 and 10." };
  return { ok: true as const, value: energy };
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

export async function saveDailyReportAction(input: { wins?: string; blockers?: string; energy?: string }): Promise<ReportResult> {
  const { supabase, userId, today } = await currentUserToday();
  if (!supabase || !userId || !today) return { ok: false, error: "Please sign in before writing your report." };

  const wins = cleanText(input.wins, 2000);
  if (!wins.ok) return wins;
  const blockers = cleanText(input.blockers, 2000);
  if (!blockers.ok) return blockers;
  const energy = cleanEnergy(input.energy);
  if (!energy.ok) return energy;

  const { error } = await supabase.from("daily_reports").upsert({ user_id: userId, report_date: today, wins: wins.value, blockers: blockers.value, energy: energy.value }, { onConflict: "user_id,report_date" });
  if (error) return { ok: false, error: "Your report could not be saved. Please try again." };
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}

export async function saveWeeklyReviewAction(input: { summary?: string; lessons?: string; nextFocus?: string }): Promise<ReportResult> {
  const access = await getAuthorizedAccess();
  const supabase = access?.supabase;
  const userId = access?.userId;
  if (!supabase || !userId) return { ok: false, error: "Please sign in before writing your review." };

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  const today = todayInTimezone(profile?.timezone || "UTC");
  const parsed = new Date(`${today}T12:00:00Z`);
  const day = parsed.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  parsed.setUTCDate(parsed.getUTCDate() - diff);
  const weekStart = parsed.toISOString().slice(0, 10);

  const summary = cleanText(input.summary, 2000);
  if (!summary.ok) return summary;
  const lessons = cleanText(input.lessons, 2000);
  if (!lessons.ok) return lessons;
  const nextFocus = cleanText(input.nextFocus, 2000);
  if (!nextFocus.ok) return nextFocus;

  const { error } = await supabase.from("weekly_reviews").upsert({ user_id: userId, week_start: weekStart, summary: summary.value, lessons: lessons.value, next_focus: nextFocus.value }, { onConflict: "user_id,week_start" });
  if (error) return { ok: false, error: "Your weekly review could not be saved. Please try again." };
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true };
}
