import { getAuthorizedAccess } from "@/lib/auth/server";
import { calculateStreaks } from "@/lib/streak";

export type TodayTask = {
  id: string;
  title: string;
  description: string | null;
  status: "inbox" | "planned" | "in_progress" | "completed" | "cancelled";
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  roadmapWeekId: string | null;
  completedToday: boolean;
};

export type TodayReport = {
  id: string;
  reportDate: string;
  wins: string | null;
  blockers: string | null;
  energy: number | null;
};

export type WeeklyReview = {
  id: string;
  weekStart: string;
  summary: string | null;
  lessons: string | null;
  nextFocus: string | null;
};

export type TodayData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  displayDate: string;
  dayOfWeek: string;
  displayName: string | null;
  tasks: TodayTask[];
  completedTaskCount: number;
  taskCount: number;
  completionPercent: number;
  completedMinutes: number;
  remainingMinutes: number;
  focusedMinutesToday: number | null;
  dailyMinimumTasks: number;
  dailyMinimumComplete: boolean;
  dailyState: "NOT_STARTED" | "IN_PROGRESS" | "MINIMUM_ACHIEVED" | "DAY_COMPLETED";
  currentStreak: number;
  longestStreak: number;
  productiveDays: number;
  missedYesterday: boolean;
  report: TodayReport | null;
  weeklyReview: WeeklyReview | null;
  week: {
    weekStart: string;
    weekEnd: string | null;
    objective: string | null;
    status: string;
    completedCount: number;
    totalCount: number;
    completionPercent: number;
  } | null;
  roadmap: {
    goalTitle: string | null;
    year: number;
    yearTitle: string;
    phaseTitle: string | null;
    monthTitle: string | null;
    weekTitle: string | null;
    objective: string | null;
  } | null;
  roadmapWeeks: Array<{ id: string; label: string }>;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TodayTask["status"];
  priority: number;
  due_on: string | null;
  scheduled_for: string | null;
  estimated_minutes: number | null;
  roadmap_week_id: string | null;
  created_at: string;
};

type CompletionRow = { task_id: string; completed_on: string };
type ProfileRow = { display_name: string | null; timezone: string };

function dateInTimezone(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, amount: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + amount);
  return shifted.toISOString().slice(0, 10);
}

function weekStartFor(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  const day = parsed.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  parsed.setUTCDate(parsed.getUTCDate() - diff);
  return parsed.toISOString().slice(0, 10);
}

function emptyToday(today: string, displayDate: string, error: string | null = null): TodayData {
  return {
    authenticated: false,
    error,
    today,
    displayDate,
    dayOfWeek: "",
    displayName: null,
    tasks: [],
    completedTaskCount: 0,
    taskCount: 0,
    completionPercent: 0,
    completedMinutes: 0,
    remainingMinutes: 0,
    focusedMinutesToday: null,
    dailyMinimumTasks: 1,
    dailyMinimumComplete: false,
    dailyState: "NOT_STARTED",
    currentStreak: 0,
    longestStreak: 0,
    productiveDays: 0,
    missedYesterday: false,
    report: null,
    weeklyReview: null,
    week: null,
    roadmap: null,
    roadmapWeeks: [],
  };
}

export async function getTodayData(): Promise<TodayData> {
  const fallbackDate = dateInTimezone("UTC");
  const fallback = emptyToday(fallbackDate, new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(new Date()));
  const access = await getAuthorizedAccess();
  if (!access) return fallback;
  const { supabase, userId } = access;

  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name, timezone").eq("id", userId).maybeSingle<ProfileRow>();
  if (profileError) return emptyToday(fallbackDate, fallback.displayDate, "We could not load your profile. Please try again.");

  const timeZone = profile?.timezone || "UTC";
  const today = dateInTimezone(timeZone);
  const displayDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(new Date());
  const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(new Date());
  const weekStart = weekStartFor(today);

  const [todayCompletionsResult, allCompletionsResult, settingsResult, reportResult, reviewResult, focusResult, roadmapGoalResult, roadmapYearResult, weeksResult] = await Promise.all([
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).eq("completed_on", today),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).order("completed_on", { ascending: true }).limit(2000),
    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_reports").select("id, report_date, wins, blockers, energy").eq("user_id", userId).eq("report_date", today).maybeSingle(),
    supabase.from("weekly_reviews").select("id, week_start, summary, lessons, next_focus").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
    supabase.from("focus_sessions").select("duration_seconds, started_at, ended_at").eq("user_id", userId).gte("started_at", `${today}T00:00:00`).lte("started_at", `${today}T23:59:59`),
    supabase.from("goals").select("title").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle<{ title: string }>(),
    supabase.from("roadmap_years").select("year, title, objective, status, id").eq("user_id", userId).eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("roadmap_weeks").select("id, week_start, objective").eq("user_id", userId).order("week_start", { ascending: false }).limit(100),
  ]);

  const firstError = [todayCompletionsResult.error, allCompletionsResult.error, settingsResult.error, reportResult.error, reviewResult.error, focusResult.error, roadmapGoalResult.error, roadmapYearResult.error, weeksResult.error].find(Boolean);
  if (firstError) return emptyToday(today, displayDate, "We could not load today's execution view. Please try again.");

  const todayCompletions = (todayCompletionsResult.data ?? []) as CompletionRow[];
  const allCompletions = (allCompletionsResult.data ?? []) as CompletionRow[];
  const completedTaskIds = new Set(todayCompletions.map((completion) => completion.task_id));
  const taskFilter = [`due_on.eq.${today}`, `scheduled_for.eq.${today}`, "status.eq.in_progress"];
  if (completedTaskIds.size > 0) taskFilter.push(`id.in.(${[...completedTaskIds].join(",")})`);

  const { data: taskRows, error: tasksError } = await supabase.from("tasks").select("id, title, description, status, priority, due_on, scheduled_for, estimated_minutes, roadmap_week_id, created_at").eq("user_id", userId).or(taskFilter.join(","));
  if (tasksError) return emptyToday(today, displayDate, "We could not load today's tasks. Please try again.");

  const tasks = ((taskRows ?? []) as TaskRow[]).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueOn: task.due_on,
    scheduledFor: task.scheduled_for,
    estimatedMinutes: task.estimated_minutes,
    roadmapWeekId: task.roadmap_week_id,
    completedToday: completedTaskIds.has(task.id) || task.status === "completed",
  }));

  const orderedTasks = tasks.sort((left, right) => {
    const leftComplete = left.completedToday;
    const rightComplete = right.completedToday;
    if (leftComplete !== rightComplete) return leftComplete ? 1 : -1;
    if (left.priority !== right.priority) return left.priority - right.priority;
    const leftOverdue = Boolean(left.dueOn && left.dueOn < today && !leftComplete);
    const rightOverdue = Boolean(right.dueOn && right.dueOn < today && !rightComplete);
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
    return (left.dueOn ?? "9999-12-31").localeCompare(right.dueOn ?? "9999-12-31") || (left.id).localeCompare(right.id);
  });

  const completedTaskCount = todayCompletions.length;
  const taskCount = orderedTasks.length;
  const completionPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
  const completedMinutes = orderedTasks.filter((task) => task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const remainingMinutes = orderedTasks.filter((task) => !task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const focusedMinutesToday = ((focusResult.data ?? []) as Array<{ duration_seconds: number }>).reduce((sum, session) => sum + session.duration_seconds, 0) > 0 ? Math.round(((focusResult.data ?? []) as Array<{ duration_seconds: number }>).reduce((sum, session) => sum + session.duration_seconds, 0) / 60) : null;

  const streaks = calculateStreaks(allCompletions.map((completion) => completion.completed_on), today);
  const settings = (settingsResult.data?.settings ?? {}) as Record<string, unknown>;
  const configuredMinimum = Number(settings.daily_minimum_tasks);
  const dailyMinimumTasks = Number.isInteger(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 1;
  const dailyMinimumComplete = completedTaskCount >= dailyMinimumTasks;

  let dailyState: TodayData["dailyState"] = "NOT_STARTED";
  if (completedTaskCount > 0) dailyState = dailyMinimumComplete ? "MINIMUM_ACHIEVED" : "IN_PROGRESS";
  if (dailyMinimumComplete && reportResult.data) dailyState = "DAY_COMPLETED";

  const report = reportResult.data ? { id: reportResult.data.id, reportDate: reportResult.data.report_date, wins: reportResult.data.wins, blockers: reportResult.data.blockers, energy: reportResult.data.energy } : null;
  const weeklyReview = reviewResult.data ? { id: reviewResult.data.id, weekStart: reviewResult.data.week_start, summary: reviewResult.data.summary, lessons: reviewResult.data.lessons, nextFocus: reviewResult.data.next_focus } : null;

  const roadmapYear = roadmapYearResult.data as { id: string; year: number; title: string; objective: string | null; status: string } | null;
  let roadmap: TodayData["roadmap"] = roadmapYear ? { goalTitle: roadmapGoalResult.data?.title ?? null, year: roadmapYear.year, yearTitle: roadmapYear.title, phaseTitle: null, monthTitle: null, weekTitle: null, objective: roadmapYear.objective } : null;

  let week: TodayData["week"] = null;
  if (roadmapYear) {
    const { data: phase } = await supabase.from("roadmap_phases").select("id, title, objective, status").eq("user_id", userId).eq("roadmap_year_id", roadmapYear.id).eq("status", "active").order("sort_order", { ascending: true }).limit(1).maybeSingle();
    if (phase) {
      const { data: month } = await supabase.from("roadmap_months").select("id, title").eq("user_id", userId).eq("roadmap_phase_id", phase.id).eq("status", "active").order("month_start", { ascending: false }).limit(1).maybeSingle();
      let weekTitle: string | null = null;
      if (month) {
        const { data: weekRow } = await supabase.from("roadmap_weeks").select("id, week_start, week_end, objective, status").eq("user_id", userId).eq("roadmap_month_id", month.id).eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
        if (weekRow) {
          weekTitle = weekRow.objective || (weekRow.week_start ? `Week of ${weekRow.week_start}` : null);
          const weekStartDate = weekRow.week_start;
          const weekEndDate = weekRow.week_end ?? shiftDate(weekStartDate, 6);
          const { data: weekCompletions } = await supabase.from("task_completions").select("task_id").eq("user_id", userId).gte("completed_on", weekStartDate).lte("completed_on", weekEndDate);
          const { data: weekTasks } = await supabase.from("tasks").select("id").eq("user_id", userId).gte("due_on", weekStartDate).lte("due_on", weekEndDate);
          const completedCount = (weekCompletions ?? []).length;
          const totalCount = (weekTasks ?? []).length;
          week = { weekStart: weekStartDate, weekEnd: weekRow.week_end, objective: weekRow.objective, status: weekRow.status, completedCount, totalCount, completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0 };
        }
      }
      roadmap = { goalTitle: roadmapGoalResult.data?.title ?? null, year: roadmapYear.year, yearTitle: roadmapYear.title, phaseTitle: phase.title, monthTitle: month?.title ?? null, weekTitle, objective: phase.objective ?? roadmapYear.objective };
    }
  }

  const hasPriorHistory = allCompletions.some((completion) => completion.completed_on < today);
  const missedYesterday = hasPriorHistory && !allCompletions.some((completion) => completion.completed_on === shiftDate(today, -1));

  return {
    authenticated: true,
    error: null,
    today,
    displayDate,
    dayOfWeek,
    displayName: profile?.display_name?.trim() || null,
    tasks: orderedTasks,
    completedTaskCount,
    taskCount,
    completionPercent,
    completedMinutes,
    remainingMinutes,
    focusedMinutesToday,
    dailyMinimumTasks,
    dailyMinimumComplete,
    dailyState,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    productiveDays: streaks.productiveDays,
    missedYesterday,
    report,
    weeklyReview,
    week,
    roadmap,
    roadmapWeeks: ((weeksResult.data ?? []) as Array<{ id: string; week_start: string; objective: string | null }>).map((weekRow) => ({ id: weekRow.id, label: `${weekRow.week_start}${weekRow.objective ? ` · ${weekRow.objective}` : ""}` })),
  };
}
