"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { roadmapStatuses, type RoadmapStatus } from "@/features/roadmap/roadmap-data";

export type RoadmapActionResult = { ok: true } | { ok: false; error: string };

type GoalInput = { title: string; description?: string; horizonYears?: number; targetDate?: string; status?: string };
type YearInput = { goalId?: string; year: number; title: string; objective?: string; status?: string };
type PhaseInput = { roadmapYearId: string; title: string; objective?: string; sortOrder?: number; status?: string };
type MonthInput = { roadmapPhaseId: string; monthStart: string; title: string; objective?: string; status?: string };
type WeekInput = { roadmapMonthId: string; weekStart: string; weekEnd?: string; objective?: string; status?: string };

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validId(value: string) { return idPattern.test(value); }
function cleanText(value: string | undefined, maxLength: number) { const text = value?.trim() || null; return text && text.length <= maxLength ? text : text ? undefined : null; }
function cleanStatus(value: string | undefined): RoadmapStatus | undefined { return value && roadmapStatuses.includes(value as RoadmapStatus) ? value as RoadmapStatus : value === undefined ? "planned" : undefined; }
function validDate(value: string | undefined) { return value === undefined || value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value); }
function cleanTitle(value: string, label: string) { const title = value.trim(); if (!title) return { ok: false as const, error: `${label} is required.` }; if (title.length > 160) return { ok: false as const, error: `${label} must be 160 characters or fewer.` }; return { ok: true as const, value: title }; }
function fail(error: string): RoadmapActionResult { return { ok: false, error }; }
function refreshRoadmap() { revalidatePath("/roadmap"); revalidatePath("/"); }

async function accessOrFail() {
  const access = await getAuthorizedAccess();
  return access ?? null;
}

async function owns(supabase: SupabaseClient, table: string, id: string, userId: string) {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  return !error && Boolean(data);
}

function baseFields(input: { objective?: string; status?: string }) {
  const objective = cleanText(input.objective, 500);
  if (objective === undefined) return { ok: false as const, error: "Descriptions must be 500 characters or fewer." };
  const status = cleanStatus(input.status);
  if (!status) return { ok: false as const, error: "Choose a valid roadmap status." };
  return { ok: true as const, value: { objective, status } };
}

export async function createGoalAction(input: GoalInput): Promise<RoadmapActionResult> {
  const title = cleanTitle(input.title, "Goal title"); if (!title.ok) return title;
  const description = cleanText(input.description, 1000); if (description === undefined) return fail("Notes must be 1000 characters or fewer.");
  const status = cleanStatus(input.status); if (!status) return fail("Choose a valid goal status.");
  if (input.horizonYears !== undefined && (!Number.isInteger(input.horizonYears) || input.horizonYears < 1 || input.horizonYears > 100)) return fail("Horizon must be between 1 and 100 years.");
  if (!validDate(input.targetDate)) return fail("Choose a valid target date.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  const { error } = await access.supabase.from("goals").insert({ user_id: access.userId, title: title.value, description, horizon_years: input.horizonYears ?? null, target_date: input.targetDate || null, status });
  if (error) return fail("The goal could not be created. Please try again.");
  refreshRoadmap(); return { ok: true };
}

export async function updateGoalAction(id: string, input: GoalInput): Promise<RoadmapActionResult> {
  if (!validId(id)) return fail("That goal could not be identified.");
  const title = cleanTitle(input.title, "Goal title"); if (!title.ok) return title;
  const description = cleanText(input.description, 1000); if (description === undefined) return fail("Notes must be 1000 characters or fewer.");
  const status = cleanStatus(input.status); if (!status) return fail("Choose a valid goal status.");
  if (input.horizonYears !== undefined && (!Number.isInteger(input.horizonYears) || input.horizonYears < 1 || input.horizonYears > 100)) return fail("Horizon must be between 1 and 100 years.");
  if (!validDate(input.targetDate)) return fail("Choose a valid target date.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  const { error } = await access.supabase.from("goals").update({ title: title.value, description, horizon_years: input.horizonYears ?? null, target_date: input.targetDate || null, status }).eq("id", id).eq("user_id", access.userId);
  if (error) return fail("The goal could not be updated. Please try again.");
  refreshRoadmap(); return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<RoadmapActionResult> {
  if (!validId(id)) return fail("That goal could not be identified.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  const { error } = await access.supabase.from("goals").delete().eq("id", id).eq("user_id", access.userId);
  if (error) return fail("The goal could not be deleted. Please try again.");
  refreshRoadmap(); return { ok: true };
}

export async function createYearAction(input: YearInput): Promise<RoadmapActionResult> { return saveYear(null, input); }
export async function updateYearAction(id: string, input: YearInput): Promise<RoadmapActionResult> { return saveYear(id, input); }
async function saveYear(id: string | null, input: YearInput): Promise<RoadmapActionResult> {
  if (id && !validId(id)) return fail("That roadmap year could not be identified.");
  const title = cleanTitle(input.title, "Year title"); if (!title.ok) return title;
  const fields = baseFields(input); if (!fields.ok) return fields;
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2200) return fail("Choose a valid year.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  if (input.goalId && (!validId(input.goalId) || !(await owns(access.supabase, "goals", input.goalId, access.userId)))) return fail("Choose one of your goals.");
  const values = { goal_id: input.goalId || null, year: input.year, title: title.value, objective: fields.value.objective, status: fields.value.status };
  const result = id ? await access.supabase.from("roadmap_years").update(values).eq("id", id).eq("user_id", access.userId) : await access.supabase.from("roadmap_years").insert({ user_id: access.userId, ...values });
  if (result.error) return fail("The roadmap year could not be saved. Please try again.");
  refreshRoadmap(); return { ok: true };
}

export async function deleteYearAction(id: string): Promise<RoadmapActionResult> { return deleteNode("roadmap_years", id, "roadmap year"); }

export async function createPhaseAction(input: PhaseInput): Promise<RoadmapActionResult> { return savePhase(null, input); }
export async function updatePhaseAction(id: string, input: PhaseInput): Promise<RoadmapActionResult> { return savePhase(id, input); }
async function savePhase(id: string | null, input: PhaseInput): Promise<RoadmapActionResult> {
  if (id && !validId(id)) return fail("That phase could not be identified.");
  if (!validId(input.roadmapYearId)) return fail("Choose a valid roadmap year.");
  const title = cleanTitle(input.title, "Phase title"); if (!title.ok) return title;
  const fields = baseFields(input); if (!fields.ok) return fields;
  if (!Number.isInteger(input.sortOrder) || (input.sortOrder ?? 0) < 0) return fail("Choose a valid phase order.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  if (!(await owns(access.supabase, "roadmap_years", input.roadmapYearId, access.userId))) return fail("Choose one of your roadmap years.");
  const values = { roadmap_year_id: input.roadmapYearId, title: title.value, objective: fields.value.objective, sort_order: input.sortOrder ?? 0, status: fields.value.status };
  const result = id ? await access.supabase.from("roadmap_phases").update(values).eq("id", id).eq("user_id", access.userId) : await access.supabase.from("roadmap_phases").insert({ user_id: access.userId, ...values });
  if (result.error) return fail("The phase could not be saved. Please try again.");
  refreshRoadmap(); return { ok: true };
}
export async function deletePhaseAction(id: string): Promise<RoadmapActionResult> { return deleteNode("roadmap_phases", id, "phase"); }

export async function createMonthAction(input: MonthInput): Promise<RoadmapActionResult> { return saveMonth(null, input); }
export async function updateMonthAction(id: string, input: MonthInput): Promise<RoadmapActionResult> { return saveMonth(id, input); }
async function saveMonth(id: string | null, input: MonthInput): Promise<RoadmapActionResult> {
  if (id && !validId(id)) return fail("That month could not be identified.");
  if (!validId(input.roadmapPhaseId)) return fail("Choose a valid phase.");
  const title = cleanTitle(input.title, "Month title"); if (!title.ok) return title;
  const fields = baseFields(input); if (!fields.ok) return fields;
  if (!validDate(input.monthStart)) return fail("Choose a valid month date.");
  if (!input.monthStart || !/^\d{4}-\d{2}-01$/.test(input.monthStart)) return fail("Month start must be the first day of a month.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  if (!(await owns(access.supabase, "roadmap_phases", input.roadmapPhaseId, access.userId))) return fail("Choose one of your phases.");
  const values = { roadmap_phase_id: input.roadmapPhaseId, month_start: input.monthStart, title: title.value, objective: fields.value.objective, status: fields.value.status };
  const result = id ? await access.supabase.from("roadmap_months").update(values).eq("id", id).eq("user_id", access.userId) : await access.supabase.from("roadmap_months").insert({ user_id: access.userId, ...values });
  if (result.error) return fail("The month could not be saved. Please try again.");
  refreshRoadmap(); return { ok: true };
}
export async function deleteMonthAction(id: string): Promise<RoadmapActionResult> { return deleteNode("roadmap_months", id, "month"); }

export async function createWeekAction(input: WeekInput): Promise<RoadmapActionResult> { return saveWeek(null, input); }
export async function updateWeekAction(id: string, input: WeekInput): Promise<RoadmapActionResult> { return saveWeek(id, input); }
async function saveWeek(id: string | null, input: WeekInput): Promise<RoadmapActionResult> {
  if (id && !validId(id)) return fail("That week could not be identified.");
  if (!validId(input.roadmapMonthId)) return fail("Choose a valid month.");
  const fields = baseFields(input); if (!fields.ok) return fields;
  if (!validDate(input.weekStart) || !input.weekStart) return fail("Choose a valid week start date.");
  if (!validDate(input.weekEnd)) return fail("Choose a valid week end date.");
  if (input.weekEnd && input.weekEnd < input.weekStart) return fail("Week end must be on or after week start.");
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  if (!(await owns(access.supabase, "roadmap_months", input.roadmapMonthId, access.userId))) return fail("Choose one of your months.");
  const values = { roadmap_month_id: input.roadmapMonthId, week_start: input.weekStart, week_end: input.weekEnd || null, objective: fields.value.objective, status: fields.value.status };
  const result = id ? await access.supabase.from("roadmap_weeks").update(values).eq("id", id).eq("user_id", access.userId) : await access.supabase.from("roadmap_weeks").insert({ user_id: access.userId, ...values });
  if (result.error) return fail("The week could not be saved. Please try again.");
  refreshRoadmap(); return { ok: true };
}
export async function deleteWeekAction(id: string): Promise<RoadmapActionResult> { return deleteNode("roadmap_weeks", id, "week"); }

async function deleteNode(table: string, id: string, label: string): Promise<RoadmapActionResult> {
  if (!validId(id)) return fail(`That ${label} could not be identified.`);
  const access = await accessOrFail(); if (!access) return fail("Please sign in before editing your roadmap.");
  const { error } = await access.supabase.from(table).delete().eq("id", id).eq("user_id", access.userId);
  if (error) return fail(`The ${label} could not be deleted. Please try again.`);
  refreshRoadmap(); return { ok: true };
}
