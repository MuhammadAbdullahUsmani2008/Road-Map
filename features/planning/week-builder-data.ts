import { getAuthorizedAccess } from "@/lib/auth/server";
import { dateInTimezone, shiftDate, weekEndFor, weekStartFor } from "@/lib/dates";

export type BuilderMonth = {
  id: string;
  monthStart: string;
  title: string;
  phaseTitle: string | null;
  year: number | null;
};

export type WeekBuilderData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  suggestedWeekStart: string;
  suggestedWeekEnd: string;
  months: BuilderMonth[];
};

type RawMonth = { id: string; roadmap_phase_id: string; month_start: string; title: string };
type RawPhase = { id: string; roadmap_year_id: string; title: string };
type RawYear = { id: string; year: number };

function emptyBuilder(today: string, error: string | null = null): WeekBuilderData {
  const suggestedWeekStart = weekStartFor(shiftDate(today, 7));
  return { authenticated: false, error, today, suggestedWeekStart, suggestedWeekEnd: weekEndFor(suggestedWeekStart), months: [] };
}

export async function getWeekBuilderData(): Promise<WeekBuilderData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyBuilder(fallbackToday);
  const { supabase, userId } = access;

  const [{ data: profile }, monthsResult, phasesResult, yearsResult] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>(),
    supabase.from("roadmap_months").select("id, roadmap_phase_id, month_start, title").eq("user_id", userId).order("month_start", { ascending: false }).limit(200),
    supabase.from("roadmap_phases").select("id, roadmap_year_id, title").eq("user_id", userId).limit(300),
    supabase.from("roadmap_years").select("id, year").eq("user_id", userId).limit(100),
  ]);

  const today = dateInTimezone(profile?.timezone || "UTC");
  const firstError = [monthsResult.error, phasesResult.error, yearsResult.error].find(Boolean);
  if (firstError) return emptyBuilder(today, "We could not load the week builder. Please try again.");

  const phases = (phasesResult.data ?? []) as RawPhase[];
  const years = (yearsResult.data ?? []) as RawYear[];
  const yearByPhase = new Map(phases.map((phase) => [phase.id, years.find((year) => year.id === phase.roadmap_year_id)?.year ?? null]));

  const suggestedWeekStart = weekStartFor(shiftDate(today, 7));

  return {
    authenticated: true,
    error: null,
    today,
    suggestedWeekStart,
    suggestedWeekEnd: weekEndFor(suggestedWeekStart),
    months: ((monthsResult.data ?? []) as RawMonth[]).map((month) => {
      const phase = phases.find((phase) => phase.id === month.roadmap_phase_id);
      return { id: month.id, monthStart: month.month_start, title: month.title, phaseTitle: phase?.title ?? null, year: phase ? yearByPhase.get(phase.id) ?? null : null };
    }),
  };
}
