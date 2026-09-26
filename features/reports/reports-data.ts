import { getAuthorizedAccess } from "@/lib/auth/server";
import { calculateStreaks } from "@/lib/streak";
import { clampPercent, dateInTimezone, monthEndFor, monthStartFor, shiftDate, weekEndFor, weekStartFor } from "@/lib/dates";

export type DailyReportRecord = {
  id: string;
  reportDate: string;
  wins: string | null;
  blockers: string | null;
  energy: number | null;
};

export type WeeklyReviewRecord = {
  id: string;
  weekStart: string;
  summary: string | null;
  lessons: string | null;
  nextFocus: string | null;
};

export type MonthlyReviewRecord = {
  id: string;
  monthStart: string;
  wins: string | null;
  misses: string | null;
  blockers: string | null;
  lessons: string | null;
  nextObjective: string | null;
};

export type ReportsData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  currentMonthStart: string;
  currentWeekStart: string;
  // Daily
  dailyReport: DailyReportRecord | null;
  todayCompletedCount: number;
  todayTotalCount: number;
  todayCompletionPercent: number;
  focusedMinutesToday: number | null;
  dailyMinimumTasks: number;
  dailyMinimumComplete: boolean;
  // Weekly
  weeklyReview: WeeklyReviewRecord | null;
  weekCompletedCount: number;
  weekTotalCount: number;
  weekCompletionPercent: number;
  weekFocusedMinutes: number | null;
  weekActiveDays: number;
  weekEligibleDays: number;
  // Monthly
  monthlyReview: MonthlyReviewRecord | null;
  monthCompletedCount: number;
  monthTotalCount: number;
  monthCompletionPercent: number;
  monthFocusedMinutes: number | null;
  monthActiveDays: number;
  monthEligibleDays: number;
  currentStreak: number;
  longestStreak: number;
  productiveDays: number;
};

type RawCompletion = { task_id: string; completed_on: string };
type RawTask = { id: string; due_on: string | null; scheduled_for: string | null; status: string };
type RawFocus = { duration_seconds: number; started_at: string };

function emptyReports(today: string, error: string | null = null): ReportsData {
  return {
    authenticated: false,
    error,
    today,
    currentMonthStart: monthStartFor(today),
    currentWeekStart: weekStartFor(today),
    dailyReport: null,
    todayCompletedCount: 0,
    todayTotalCount: 0,
    todayCompletionPercent: 0,
    focusedMinutesToday: null,
    dailyMinimumTasks: 1,
    dailyMinimumComplete: false,
    weeklyReview: null,
    weekCompletedCount: 0,
    weekTotalCount: 0,
    weekCompletionPercent: 0,
    weekFocusedMinutes: null,
    weekActiveDays: 0,
    weekEligibleDays: 0,
    monthlyReview: null,
    monthCompletedCount: 0,
    monthTotalCount: 0,
    monthCompletionPercent: 0,
    monthFocusedMinutes: null,
    monthActiveDays: 0,
    monthEligibleDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    productiveDays: 0,
  };
}

function sumFocusMinutes(rows: RawFocus[]) {
  const total = rows.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0);
  return total > 0 ? Math.round(total / 60) : null;
}

export async function getReportsData(): Promise<ReportsData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyReports(fallbackToday);
  const { supabase, userId } = access;

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  const today = dateInTimezone(profile?.timezone || "UTC");
  const monthStart = monthStartFor(today);
  const weekStart = weekStartFor(today);

  const [completionsResult, tasksResult, settingsResult, dailyReportResult, weeklyReviewResult, monthlyReviewResult, focusResult] = await Promise.all([
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).order("completed_on", { ascending: true }).limit(4000),
    supabase.from("tasks").select("id, due_on, scheduled_for, status").eq("user_id", userId).limit(2000),
    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_reports").select("id, report_date, wins, blockers, energy").eq("user_id", userId).eq("report_date", today).maybeSingle(),
    supabase.from("weekly_reviews").select("id, week_start, summary, lessons, next_focus").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
    supabase.from("monthly_reviews").select("id, month_start, wins, misses, blockers, lessons, next_objective").eq("user_id", userId).eq("month_start", monthStart).maybeSingle(),
    supabase.from("focus_sessions").select("duration_seconds, started_at").eq("user_id", userId).gte("started_at", `${monthStart}T00:00:00`).lte("started_at", `${monthEndFor(monthStart)}T23:59:59`),
  ]);

  const firstError = [completionsResult.error, tasksResult.error, settingsResult.error, dailyReportResult.error, weeklyReviewResult.error, monthlyReviewResult.error, focusResult.error].find(Boolean);
  if (firstError) return emptyReports(today, "We could not load your reports. Please try again.");

  const completions = (completionsResult.data ?? []) as RawCompletion[];
  const tasks = (tasksResult.data ?? []) as RawTask[];
  const focusRows = (focusResult.data ?? []) as RawFocus[];

  const monthEnd = monthEndFor(monthStart);
  const weekEnd = weekEndFor(weekStart);

  const completionDatesByTask = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = completionDatesByTask.get(completion.task_id) ?? new Set<string>();
    set.add(completion.completed_on);
    completionDatesByTask.set(completion.task_id, set);
  }

  const isCompletedInRange = (task: RawTask, start: string, end: string) => {
    const dates = completionDatesByTask.get(task.id);
    if (dates) for (const date of dates) if (date >= start && date <= end) return true;
    return task.status === "completed";
  };

  const todayTasks = tasks.filter((task) => task.due_on === today || task.scheduled_for === today || task.status === "in_progress");
  const todayCompletedCount = todayTasks.filter((task) => isCompletedInRange(task, today, today)).length;
  const todayTotalCount = todayTasks.length;

  const weekTasks = tasks.filter((task) => (task.due_on && task.due_on >= weekStart && task.due_on <= weekEnd) || (task.scheduled_for && task.scheduled_for >= weekStart && task.scheduled_for <= weekEnd));
  const weekCompletedCount = weekTasks.filter((task) => isCompletedInRange(task, weekStart, weekEnd)).length;
  const weekTotalCount = weekTasks.length;

  const monthTasks = tasks.filter((task) => (task.due_on && task.due_on >= monthStart && task.due_on <= monthEnd) || (task.scheduled_for && task.scheduled_for >= monthStart && task.scheduled_for <= monthEnd));
  const monthCompletedCount = monthTasks.filter((task) => isCompletedInRange(task, monthStart, monthEnd)).length;
  const monthTotalCount = monthTasks.length;

  // Focus minutes per range.
  const focusInRange = (start: string, end: string) => sumFocusMinutes(focusRows.filter((row) => row.started_at >= `${start}T00:00:00` && row.started_at <= `${end}T23:59:59`));

  // Active days: distinct completion dates within a range.
  const activeDaysInRange = (start: string, end: string) => {
    const dates = new Set<string>();
    for (const completion of completions) if (completion.completed_on >= start && completion.completed_on <= end) dates.add(completion.completed_on);
    return dates.size;
  };

  const eligibleDaysInRange = (start: string, end: string) => {
    const startDate = new Date(`${start}T12:00:00Z`);
    const endDate = new Date(`${end}T12:00:00Z`);
    const todayDate = new Date(`${today}T12:00:00Z`);
    const last = endDate > todayDate ? todayDate : endDate;
    const days = Math.floor((last.getTime() - startDate.getTime()) / 86400000) + 1;
    return Math.max(0, days);
  };

  const settings = (settingsResult.data?.settings ?? {}) as Record<string, unknown>;
  const configuredMinimum = Number(settings.daily_minimum_tasks);
  const dailyMinimumTasks = Number.isInteger(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 1;
  const dailyMinimumComplete = todayCompletedCount >= dailyMinimumTasks;

  const streaks = calculateStreaks(completions.map((completion) => completion.completed_on), today);

  const dailyReport = dailyReportResult.data ? { id: dailyReportResult.data.id, reportDate: dailyReportResult.data.report_date, wins: dailyReportResult.data.wins, blockers: dailyReportResult.data.blockers, energy: dailyReportResult.data.energy } : null;
  const weeklyReview = weeklyReviewResult.data ? { id: weeklyReviewResult.data.id, weekStart: weeklyReviewResult.data.week_start, summary: weeklyReviewResult.data.summary, lessons: weeklyReviewResult.data.lessons, nextFocus: weeklyReviewResult.data.next_focus } : null;
  const monthlyReview = monthlyReviewResult.data ? { id: monthlyReviewResult.data.id, monthStart: monthlyReviewResult.data.month_start, wins: monthlyReviewResult.data.wins, misses: monthlyReviewResult.data.misses, blockers: monthlyReviewResult.data.blockers, lessons: monthlyReviewResult.data.lessons, nextObjective: monthlyReviewResult.data.next_objective } : null;

  return {
    authenticated: true,
    error: null,
    today,
    currentMonthStart: monthStart,
    currentWeekStart: weekStart,
    dailyReport,
    todayCompletedCount,
    todayTotalCount,
    todayCompletionPercent: todayTotalCount > 0 ? clampPercent((todayCompletedCount / todayTotalCount) * 100) : 0,
    focusedMinutesToday: focusInRange(today, today),
    dailyMinimumTasks,
    dailyMinimumComplete,
    weeklyReview,
    weekCompletedCount,
    weekTotalCount,
    weekCompletionPercent: weekTotalCount > 0 ? clampPercent((weekCompletedCount / weekTotalCount) * 100) : 0,
    weekFocusedMinutes: focusInRange(weekStart, weekEnd),
    weekActiveDays: activeDaysInRange(weekStart, weekEnd),
    weekEligibleDays: eligibleDaysInRange(weekStart, weekEnd),
    monthlyReview,
    monthCompletedCount,
    monthTotalCount,
    monthCompletionPercent: monthTotalCount > 0 ? clampPercent((monthCompletedCount / monthTotalCount) * 100) : 0,
    monthFocusedMinutes: focusInRange(monthStart, monthEnd),
    monthActiveDays: activeDaysInRange(monthStart, monthEnd),
    monthEligibleDays: eligibleDaysInRange(monthStart, monthEnd),
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    productiveDays: streaks.productiveDays,
  };
}

export { shiftDate };
