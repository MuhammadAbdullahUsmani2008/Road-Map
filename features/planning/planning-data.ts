import { getAuthorizedAccess } from "@/lib/auth/server";
import { clampPercent, dateInTimezone, monthEndFor, monthStartFor, weekEndFor, weekStartFor } from "@/lib/dates";

export type PlanningWeekTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type PlanningWeek = {
  id: string;
  roadmapMonthId: string;
  weekStart: string;
  weekEnd: string | null;
  objective: string | null;
  status: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  tasks: PlanningWeekTask[];
};

export type PlanningMonth = {
  id: string;
  roadmapPhaseId: string;
  monthStart: string;
  title: string;
  objective: string | null;
  status: string;
  phaseTitle: string | null;
  year: number | null;
  yearTitle: string | null;
  goalTitle: string | null;
  weeks: PlanningWeek[];
  completedCount: number;
  totalCount: number;
  completionPercent: number;
};

export type PlanningData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  currentMonthStart: string;
  currentWeekStart: string;
  months: PlanningMonth[];
  currentMonth: PlanningMonth | null;
  currentWeek: PlanningWeek | null;
};

type RawGoal = { id: string; title: string };
type RawYear = { id: string; year: number; title: string; goal_id: string | null };
type RawPhase = { id: string; roadmap_year_id: string; title: string };
type RawMonth = { id: string; roadmap_phase_id: string; month_start: string; title: string; objective: string | null; status: string };
type RawWeek = { id: string; roadmap_month_id: string; week_start: string; week_end: string | null; objective: string | null; status: string };
type RawTask = { id: string; title: string; roadmap_week_id: string | null; due_on: string | null; scheduled_for: string | null; status: string };
type RawCompletion = { task_id: string; completed_on: string };

function emptyPlanning(today: string, error: string | null = null): PlanningData {
  return { authenticated: false, error, today, currentMonthStart: monthStartFor(today), currentWeekStart: weekStartFor(today), months: [], currentMonth: null, currentWeek: null };
}

export async function getPlanningData(): Promise<PlanningData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyPlanning(fallbackToday);
  const { supabase, userId } = access;

  const [{ data: profile }, goalsResult, yearsResult, phasesResult, monthsResult, weeksResult, tasksResult, completionsResult] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>(),
    supabase.from("goals").select("id, title").eq("user_id", userId).order("created_at", { ascending: true }).limit(100),
    supabase.from("roadmap_years").select("id, year, title, goal_id").eq("user_id", userId).order("year", { ascending: true }).limit(100),
    supabase.from("roadmap_phases").select("id, roadmap_year_id, title").eq("user_id", userId).order("sort_order", { ascending: true }).limit(300),
    supabase.from("roadmap_months").select("id, roadmap_phase_id, month_start, title, objective, status").eq("user_id", userId).order("month_start", { ascending: true }).limit(600),
    supabase.from("roadmap_weeks").select("id, roadmap_month_id, week_start, week_end, objective, status").eq("user_id", userId).order("week_start", { ascending: true }).limit(1200),
    supabase.from("tasks").select("id, title, roadmap_week_id, due_on, scheduled_for, status").eq("user_id", userId).limit(2000),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).limit(4000),
  ]);

  const today = dateInTimezone(profile?.timezone || "UTC");
  const firstError = [goalsResult.error, yearsResult.error, phasesResult.error, monthsResult.error, weeksResult.error, tasksResult.error, completionsResult.error].find(Boolean);
  if (firstError) return emptyPlanning(today, "We could not load your planning view. Please try again.");

  const goals = (goalsResult.data ?? []) as RawGoal[];
  const years = (yearsResult.data ?? []) as RawYear[];
  const phases = (phasesResult.data ?? []) as RawPhase[];
  const months = (monthsResult.data ?? []) as RawMonth[];
  const weeks = (weeksResult.data ?? []) as RawWeek[];
  const tasks = (tasksResult.data ?? []) as RawTask[];
  const completions = (completionsResult.data ?? []) as RawCompletion[];

  const goalById = new Map(goals.map((goal) => [goal.id, goal.title]));
  const yearByPhase = new Map(phases.map((phase) => [phase.id, years.find((year) => year.id === phase.roadmap_year_id)]));
  const phaseByMonth = new Map(months.map((month) => [month.id, phases.find((phase) => phase.id === month.roadmap_phase_id)]));

  // Completion dates per task.
  const completionDatesByTask = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = completionDatesByTask.get(completion.task_id) ?? new Set<string>();
    set.add(completion.completed_on);
    completionDatesByTask.set(completion.task_id, set);
  }

  const planningMonths: PlanningMonth[] = months.map((month) => {
    const monthWeeks = weeks.filter((week) => week.roadmap_month_id === month.id);
    const monthStart = month.month_start;
    const monthEnd = monthEndFor(monthStart);

    const weeksWithProgress: PlanningWeek[] = monthWeeks.map((week) => {
      const weekStart = week.week_start;
      const weekEnd = week.week_end ?? weekEndFor(weekStart);
      const weekTasks = tasks.filter((task) => task.roadmap_week_id === week.id || (task.due_on && task.due_on >= weekStart && task.due_on <= weekEnd) || (task.scheduled_for && task.scheduled_for >= weekStart && task.scheduled_for <= weekEnd));
      const completedCount = weekTasks.filter((task) => {
        const dates = completionDatesByTask.get(task.id);
        if (dates) for (const date of dates) if (date >= weekStart && date <= weekEnd) return true;
        return task.status === "completed";
      }).length;
      const totalCount = weekTasks.length;
      const weekTaskList: PlanningWeekTask[] = weekTasks.map((task) => {
        const dates = completionDatesByTask.get(task.id);
        let completed = task.status === "completed";
        if (dates) for (const date of dates) if (date >= weekStart && date <= weekEnd) completed = true;
        return { id: task.id, title: task.title, completed };
      });
      return { id: week.id, roadmapMonthId: week.roadmap_month_id, weekStart, weekEnd: week.week_end, objective: week.objective, status: week.status, completedCount, totalCount, completionPercent: totalCount > 0 ? clampPercent((completedCount / totalCount) * 100) : 0, tasks: weekTaskList };
    });

    const monthTasks = tasks.filter((task) => {
      const weekId = task.roadmap_week_id;
      if (weekId && monthWeeks.some((week) => week.id === weekId)) return true;
      return (task.due_on && task.due_on >= monthStart && task.due_on <= monthEnd) || (task.scheduled_for && task.scheduled_for >= monthStart && task.scheduled_for <= monthEnd);
    });
    const completedCount = monthTasks.filter((task) => {
      const dates = completionDatesByTask.get(task.id);
      if (dates) for (const date of dates) if (date >= monthStart && date <= monthEnd) return true;
      return task.status === "completed";
    }).length;
    const totalCount = monthTasks.length;

    const phase = phaseByMonth.get(month.id);
    const year = phase ? yearByPhase.get(phase.id) : undefined;

    return {
      id: month.id,
      roadmapPhaseId: month.roadmap_phase_id,
      monthStart,
      title: month.title,
      objective: month.objective,
      status: month.status,
      phaseTitle: phase?.title ?? null,
      year: year?.year ?? null,
      yearTitle: year?.title ?? null,
      goalTitle: year?.goal_id ? goalById.get(year.goal_id) ?? null : null,
      weeks: weeksWithProgress,
      completedCount,
      totalCount,
      completionPercent: totalCount > 0 ? clampPercent((completedCount / totalCount) * 100) : 0,
    };
  });

  const currentMonthStart = monthStartFor(today);
  const currentWeekStart = weekStartFor(today);
  const currentMonth = planningMonths.find((month) => month.monthStart === currentMonthStart) ?? null;
  const currentWeek = currentMonth?.weeks.find((week) => week.weekStart === currentWeekStart) ?? null;

  return {
    authenticated: true,
    error: null,
    today,
    currentMonthStart,
    currentWeekStart,
    months: planningMonths,
    currentMonth,
    currentWeek,
  };
}
