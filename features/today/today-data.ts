import { getAuthorizedAccess } from "@/lib/auth/server";
import { calculateStreaks } from "@/lib/streak";
import {
  compareTasksDeterministic,
  getDoThisNextTask,
  inferTrack,
  type TodayTask,
  type TodayTrack,
} from "./today-helpers";
import { getActiveCommitment, getDailyMotivation, getRecoveryItems, type Commitment, type MotivationItem } from "@/features/motivation/motivation-data";
import { getLiveMotivationData, markLiveMotivationShown, selectDailyLiveMotivation, type LiveMotivationItem } from "@/features/motivation/live-motivation-data";

export { compareTasksDeterministic, getDoThisNextTask, inferTrack, type TodayTask, type TodayTrack };

export type ActiveFocusSession = {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  startedAt: string;
  activeStartedAt: string | null;
  pausedAt: string | null;
  durationSeconds: number;
  status: "active" | "paused";
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
  overdueTasks: TodayTask[];
  completedTaskCount: number;
  taskCount: number;
  remainingTaskCount: number;
  completionPercent: number;
  completedMinutes: number;
  remainingMinutes: number;
  focusedMinutesToday: number | null;
  activeFocusSession: ActiveFocusSession | null;
  dailyMinimumTasks: number;
  dailyMinimumComplete: boolean;
  dailyState: "NOT_STARTED" | "IN_PROGRESS" | "MINIMUM_ACHIEVED" | "DAY_COMPLETED";
  currentStreak: number;
  longestStreak: number;
  productiveDays: number;
  missedYesterday: boolean;
  yesterdayStats: {
    completedCount: number;
    incompleteCount: number;
  } | null;
  trackSummary: Array<{
    track: TodayTrack;
    planned: number;
    completed: number;
    remaining: number;
  }>;
  report: TodayReport | null;
  weeklyReview: WeeklyReview | null;
  week: {
    id?: string;
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
  dailyMotivation: MotivationItem | null;
  activeCommitment: Commitment | null;
  recoveryItems: MotivationItem[];
  liveMotivation: LiveMotivationItem | null;
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
  track: string | null;
  import_key: string | null;
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
    overdueTasks: [],
    completedTaskCount: 0,
    taskCount: 0,
    remainingTaskCount: 0,
    completionPercent: 0,
    completedMinutes: 0,
    remainingMinutes: 0,
    focusedMinutesToday: null,
    activeFocusSession: null,
    dailyMinimumTasks: 1,
    dailyMinimumComplete: false,
    dailyState: "NOT_STARTED",
    currentStreak: 0,
    longestStreak: 0,
    productiveDays: 0,
    missedYesterday: false,
    yesterdayStats: null,
    trackSummary: [
      { track: "E-Commerce", planned: 0, completed: 0, remaining: 0 },
      { track: "YouTube Automation", planned: 0, completed: 0, remaining: 0 },
      { track: "Operating System", planned: 0, completed: 0, remaining: 0 },
    ],
    report: null,
    weeklyReview: null,
    week: null,
    roadmap: null,
    roadmapWeeks: [],
    dailyMotivation: null,
    activeCommitment: null,
    recoveryItems: [],
    liveMotivation: null,
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
  const yesterday = shiftDate(today, -1);

  const [
    todayCompletionsResult,
    allCompletionsResult,
    settingsResult,
    reportResult,
    reviewResult,
    focusResult,
    activeFocusResult,
    roadmapGoalResult,
    roadmapYearResult,
    weeksResult,
    overdueResult,
    yesterdayTasksResult,
    motivationItemsResult,
    commitmentsResult,
    liveMotivationData,
  ] = await Promise.all([
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).eq("completed_on", today),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).order("completed_on", { ascending: true }).limit(2000),
    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_reports").select("id, report_date, wins, blockers, energy").eq("user_id", userId).eq("report_date", today).maybeSingle(),
    supabase.from("weekly_reviews").select("id, week_start, summary, lessons, next_focus").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
    supabase.from("focus_sessions").select("duration_seconds, started_at, ended_at").eq("user_id", userId).gte("started_at", `${today}T00:00:00`).lte("started_at", `${today}T23:59:59`),
    supabase.from("focus_sessions").select("id, task_id, started_at, active_started_at, paused_at, ended_at, duration_seconds, status").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("goals").select("title").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle<{ title: string }>(),
    supabase.from("roadmap_years").select("year, title, objective, status, id").eq("user_id", userId).eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("roadmap_weeks").select("id, week_start, objective").eq("user_id", userId).order("week_start", { ascending: false }).limit(100),
    supabase.from("tasks").select("id, title, description, status, priority, due_on, scheduled_for, estimated_minutes, roadmap_week_id, track, import_key, created_at").eq("user_id", userId).lt("due_on", today).neq("status", "completed").neq("status", "cancelled").order("priority", { ascending: true }).order("due_on", { ascending: true }).limit(50),
    supabase.from("tasks").select("id, due_on, scheduled_for").eq("user_id", userId).or(`due_on.eq.${yesterday},scheduled_for.eq.${yesterday}`),
    supabase.from("motivation_items").select("id, title, content, kind, is_active, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("commitments").select("id, title, description, cadence, status, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    getLiveMotivationData(),
  ]);

  const firstError = [todayCompletionsResult.error, allCompletionsResult.error, settingsResult.error, reportResult.error, reviewResult.error, focusResult.error, roadmapGoalResult.error, roadmapYearResult.error, weeksResult.error].find(Boolean);
  if (firstError) return emptyToday(today, displayDate, "We could not load today's execution view. Please try again.");

  const todayCompletions = (todayCompletionsResult.data ?? []) as CompletionRow[];
  const allCompletions = (allCompletionsResult.data ?? []) as CompletionRow[];
  const completedTaskIds = new Set(todayCompletions.map((completion) => completion.task_id));
  const taskFilter = [`due_on.eq.${today}`, `scheduled_for.eq.${today}`, "status.eq.in_progress"];
  if (completedTaskIds.size > 0) taskFilter.push(`id.in.(${[...completedTaskIds].join(",")})`);

  const { data: taskRows, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_on, scheduled_for, estimated_minutes, roadmap_week_id, track, import_key, created_at")
    .eq("user_id", userId)
    .or(taskFilter.join(","));

  if (tasksError) return emptyToday(today, displayDate, "We could not load today's tasks. Please try again.");

  const tasks: TodayTask[] = ((taskRows ?? []) as TaskRow[]).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueOn: task.due_on,
    scheduledFor: task.scheduled_for,
    estimatedMinutes: task.estimated_minutes,
    roadmapWeekId: task.roadmap_week_id,
    track: inferTrack(task),
    completedToday: completedTaskIds.has(task.id) || task.status === "completed",
    createdAt: task.created_at,
  }));

  const overdueTasks: TodayTask[] = (((overdueResult.data ?? []) as TaskRow[])
    .filter((task) => !completedTaskIds.has(task.id))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueOn: task.due_on,
      scheduledFor: task.scheduled_for,
      estimatedMinutes: task.estimated_minutes,
      roadmapWeekId: task.roadmap_week_id,
      track: inferTrack(task),
      completedToday: false,
      createdAt: task.created_at,
    })));

  const orderedTasks = [...tasks].sort((left, right) => compareTasksDeterministic(left, right, today));

  const completedTaskCount = tasks.filter((t) => t.completedToday).length;
  const taskCount = tasks.length;
  const remainingTaskCount = tasks.filter((t) => !t.completedToday).length;
  const completionPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
  const completedMinutes = tasks.filter((task) => task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const remainingMinutes = tasks.filter((task) => !task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const focusedMinutesToday = ((focusResult.data ?? []) as Array<{ duration_seconds: number }>).reduce((sum, session) => sum + session.duration_seconds, 0) > 0 ? Math.round(((focusResult.data ?? []) as Array<{ duration_seconds: number }>).reduce((sum, session) => sum + session.duration_seconds, 0) / 60) : null;

  // Active focus session
  let activeFocusSession: ActiveFocusSession | null = null;
  if (activeFocusResult.data) {
    let taskTitle: string | null = null;
    const activeTaskId = activeFocusResult.data.task_id;
    if (activeTaskId) {
      const foundInTasks = tasks.find((t) => t.id === activeTaskId) || overdueTasks.find((t) => t.id === activeTaskId);
      if (foundInTasks) {
        taskTitle = foundInTasks.title;
      } else {
        const { data: activeTaskRow } = await supabase.from("tasks").select("title").eq("id", activeTaskId).maybeSingle();
        taskTitle = activeTaskRow?.title ?? null;
      }
    }
    activeFocusSession = {
      id: activeFocusResult.data.id,
      taskId: activeTaskId,
      taskTitle,
      startedAt: activeFocusResult.data.started_at,
      activeStartedAt: activeFocusResult.data.active_started_at,
      pausedAt: activeFocusResult.data.paused_at,
      durationSeconds: activeFocusResult.data.duration_seconds ?? 0,
      status: activeFocusResult.data.status as "active" | "paused",
    };
  }

  // Streaks and Daily Minimum
  const streaks = calculateStreaks(allCompletions.map((completion) => completion.completed_on), today);
  const settings = (settingsResult.data?.settings ?? {}) as Record<string, unknown>;
  const configuredMinimum = Number(settings.daily_minimum_tasks);
  const dailyMinimumTasks = Number.isInteger(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 1;
  const dailyMinimumComplete = completedTaskCount >= dailyMinimumTasks;

  let dailyState: TodayData["dailyState"] = "NOT_STARTED";
  if (completedTaskCount > 0) dailyState = dailyMinimumComplete ? "MINIMUM_ACHIEVED" : "IN_PROGRESS";
  if (dailyMinimumComplete && reportResult.data) dailyState = "DAY_COMPLETED";

  // Track summary
  const allTracks: TodayTrack[] = ["E-Commerce", "YouTube Automation", "Operating System"];
  const trackSummary = allTracks.map((track) => {
    const trackTasks = tasks.filter((t) => t.track === track);
    const planned = trackTasks.length;
    const completed = trackTasks.filter((t) => t.completedToday).length;
    const remaining = planned - completed;
    return { track, planned, completed, remaining };
  });

  // Yesterday / Recovery
  const hasPriorHistory = allCompletions.some((completion) => completion.completed_on < today);
  const yesterdayCompletedCount = allCompletions.filter((completion) => completion.completed_on === yesterday).length;
  const missedYesterday = hasPriorHistory && yesterdayCompletedCount === 0;
  const yesterdayPlannedCount = (yesterdayTasksResult.data ?? []).length;
  const yesterdayIncompleteCount = Math.max(0, yesterdayPlannedCount - yesterdayCompletedCount);
  const yesterdayStats = hasPriorHistory ? { completedCount: yesterdayCompletedCount, incompleteCount: yesterdayIncompleteCount } : null;

  const report = reportResult.data ? { id: reportResult.data.id, reportDate: reportResult.data.report_date, wins: reportResult.data.wins, blockers: reportResult.data.blockers, energy: reportResult.data.energy } : null;
  const weeklyReview = reviewResult.data ? { id: reviewResult.data.id, weekStart: reviewResult.data.week_start, summary: reviewResult.data.summary, lessons: reviewResult.data.lessons, nextFocus: reviewResult.data.next_focus } : null;

  // Motivation & Commitment data
  const motivationItems: MotivationItem[] = ((motivationItemsResult.data ?? []) as Array<{ id: string; title: string; content: string | null; kind: string; is_active: boolean; created_at: string; updated_at: string }>).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    kind: row.kind as MotivationItem["kind"],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const commitments: Commitment[] = ((commitmentsResult.data ?? []) as Array<{ id: string; title: string; description: string | null; cadence: string; status: string; created_at: string; updated_at: string }>).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    cadence: row.cadence as Commitment["cadence"],
    status: row.status as Commitment["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const dailyMotivation = getDailyMotivation(motivationItems, today);
  const activeCommitment = getActiveCommitment(commitments);
  const recoveryItems = getRecoveryItems(motivationItems);
  const liveMotivation = liveMotivationData.authenticated && !liveMotivationData.error
    ? selectDailyLiveMotivation(liveMotivationData.items, liveMotivationData.shownHistory, today)
    : null;

  // Record shown history when a live motivation item is actually selected
  if (liveMotivation) {
    markLiveMotivationShown(liveMotivation.id, today).catch(() => {
      // Silently fail — shown history is best-effort
    });
  }

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
          week = {
            id: weekRow.id,
            weekStart: weekStartDate,
            weekEnd: weekRow.week_end,
            objective: weekRow.objective,
            status: weekRow.status,
            completedCount,
            totalCount,
            completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
          };
        }
      }
      roadmap = { goalTitle: roadmapGoalResult.data?.title ?? null, year: roadmapYear.year, yearTitle: roadmapYear.title, phaseTitle: phase.title, monthTitle: month?.title ?? null, weekTitle, objective: phase.objective ?? roadmapYear.objective };
    }
  }

  return {
    authenticated: true,
    error: null,
    today,
    displayDate,
    dayOfWeek,
    displayName: profile?.display_name?.trim() || null,
    tasks: orderedTasks,
    overdueTasks,
    completedTaskCount,
    taskCount,
    remainingTaskCount,
    completionPercent,
    completedMinutes,
    remainingMinutes,
    focusedMinutesToday,
    activeFocusSession,
    dailyMinimumTasks,
    dailyMinimumComplete,
    dailyState,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    productiveDays: streaks.productiveDays,
    missedYesterday,
    yesterdayStats,
    trackSummary,
    report,
    weeklyReview,
    week,
    roadmap,
    roadmapWeeks: ((weeksResult.data ?? []) as Array<{ id: string; week_start: string; objective: string | null }>).map((weekRow) => ({ id: weekRow.id, label: `${weekRow.week_start}${weekRow.objective ? ` · ${weekRow.objective}` : ""}` })),
    dailyMotivation,
    activeCommitment,
    recoveryItems,
    liveMotivation,
  };
}
