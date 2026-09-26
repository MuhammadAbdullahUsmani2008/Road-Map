import { getAuthorizedAccess } from "@/lib/auth/server";

export const roadmapStatuses = ["planned", "active", "completed", "archived"] as const;
export type RoadmapStatus = (typeof roadmapStatuses)[number];

export type RoadmapGoal = {
  id: string;
  title: string;
  description: string | null;
  horizonYears: number | null;
  targetDate: string | null;
  status: RoadmapStatus;
};

export type RoadmapYear = {
  id: string;
  goalId: string | null;
  year: number;
  title: string;
  objective: string | null;
  status: RoadmapStatus;
};

export type RoadmapPhase = {
  id: string;
  roadmapYearId: string;
  title: string;
  objective: string | null;
  sortOrder: number;
  status: RoadmapStatus;
};

export type RoadmapMonth = {
  id: string;
  roadmapPhaseId: string;
  monthStart: string;
  title: string;
  objective: string | null;
  status: RoadmapStatus;
};

export type RoadmapWeek = {
  id: string;
  roadmapMonthId: string;
  weekStart: string;
  weekEnd: string | null;
  objective: string | null;
  status: RoadmapStatus;
};

export type RoadmapData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  goals: RoadmapGoal[];
  years: RoadmapYear[];
  phases: RoadmapPhase[];
  months: RoadmapMonth[];
  weeks: RoadmapWeek[];
};

type RawGoal = { id: string; title: string; description: string | null; horizon_years: number | null; target_date: string | null; status: RoadmapStatus };
type RawYear = { id: string; goal_id: string | null; year: number; title: string; objective: string | null; status: RoadmapStatus };
type RawPhase = { id: string; roadmap_year_id: string; title: string; objective: string | null; sort_order: number; status: RoadmapStatus };
type RawMonth = { id: string; roadmap_phase_id: string; month_start: string; title: string; objective: string | null; status: RoadmapStatus };
type RawWeek = { id: string; roadmap_month_id: string; week_start: string; week_end: string | null; objective: string | null; status: RoadmapStatus };

type ProfileRow = { timezone: string };

function dateInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function emptyRoadmap(today: string, error: string | null = null, authenticated = false): RoadmapData {
  return { authenticated, error, today, goals: [], years: [], phases: [], months: [], weeks: [] };
}

export async function getRoadmapData(): Promise<RoadmapData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyRoadmap(fallbackToday);

  const { supabase, userId } = access;
  const [{ data: profile }, goalsResult, yearsResult, phasesResult, monthsResult, weeksResult] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<ProfileRow>(),
    supabase.from("goals").select("id, title, description, horizon_years, target_date, status").eq("user_id", userId).order("created_at", { ascending: true }).limit(100),
    supabase.from("roadmap_years").select("id, goal_id, year, title, objective, status").eq("user_id", userId).order("year", { ascending: true }).limit(100),
    supabase.from("roadmap_phases").select("id, roadmap_year_id, title, objective, sort_order, status").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }).limit(300),
    supabase.from("roadmap_months").select("id, roadmap_phase_id, month_start, title, objective, status").eq("user_id", userId).order("month_start", { ascending: true }).limit(600),
    supabase.from("roadmap_weeks").select("id, roadmap_month_id, week_start, week_end, objective, status").eq("user_id", userId).order("week_start", { ascending: true }).limit(1200),
  ]);

  const firstError = [goalsResult.error, yearsResult.error, phasesResult.error, monthsResult.error, weeksResult.error].find(Boolean);
  const today = dateInTimezone(profile?.timezone || "UTC");
  if (firstError) return emptyRoadmap(today, "We could not load your roadmap. Please try again.", true);

  return {
    authenticated: true,
    error: null,
    today,
    goals: ((goalsResult.data ?? []) as RawGoal[]).map((goal) => ({ id: goal.id, title: goal.title, description: goal.description, horizonYears: goal.horizon_years, targetDate: goal.target_date, status: goal.status })),
    years: ((yearsResult.data ?? []) as RawYear[]).map((year) => ({ id: year.id, goalId: year.goal_id, year: year.year, title: year.title, objective: year.objective, status: year.status })),
    phases: ((phasesResult.data ?? []) as RawPhase[]).map((phase) => ({ id: phase.id, roadmapYearId: phase.roadmap_year_id, title: phase.title, objective: phase.objective, sortOrder: phase.sort_order, status: phase.status })),
    months: ((monthsResult.data ?? []) as RawMonth[]).map((month) => ({ id: month.id, roadmapPhaseId: month.roadmap_phase_id, monthStart: month.month_start, title: month.title, objective: month.objective, status: month.status })),
    weeks: ((weeksResult.data ?? []) as RawWeek[]).map((week) => ({ id: week.id, roadmapMonthId: week.roadmap_month_id, weekStart: week.week_start, weekEnd: week.week_end, objective: week.objective, status: week.status })),
  };
}
