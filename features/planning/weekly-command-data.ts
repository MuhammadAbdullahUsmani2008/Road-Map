import { getAuthorizedAccess } from "@/lib/auth/server";
import { clampPercent, dateInTimezone, formatDate, shiftDate, weekEndFor } from "@/lib/dates";
import { inferTrack, type TodayTrack } from "@/features/today/today-helpers";

export type WeeklyTaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: "inbox" | "planned" | "in_progress" | "completed" | "cancelled";
  dueOn: string | null;
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  roadmapWeekId: string | null;
  track: TodayTrack;
  completedInWeek: boolean;
  completedOn: string | null;
  isOverdue: boolean;
};

export type WeeklyDayExecution = {
  date: string;
  dayName: string;
  shortDate: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  plannedCount: number;
  completedCount: number;
  remainingCount: number;
  focusedMinutes: number;
  dailyReport: {
    id: string;
    wins: string | null;
    blockers: string | null;
    energy: number | null;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    track: TodayTrack;
    priority: number;
    completed: boolean;
  }>;
};

export type WeeklyTrackSummary = {
  track: TodayTrack;
  planned: number;
  completed: number;
  remaining: number;
  overdue: number;
  completionPercent: number;
};

export type WeeklyMilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  dueOn: string | null;
  achievedOn: string | null;
  status: string;
  track: string | null;
};

export type WeeklyReviewSummary = {
  id: string | null;
  weekStart: string;
  summary: string | null;
  lessons: string | null;
  nextFocus: string | null;
  isReviewed: boolean;
};

export type WeeklyNavOption = {
  id: string;
  weekStart: string;
  weekEnd: string;
  objective: string | null;
  status: string;
  label: string;
};

export type WeeklyCommandData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  week: {
    id: string;
    weekStart: string;
    weekEnd: string;
    objective: string | null;
    status: string;
    roadmapMonthId: string;
  } | null;
  roadmap: {
    goalTitle: string | null;
    year: number | null;
    yearTitle: string | null;
    phaseTitle: string | null;
    monthTitle: string | null;
    monthStart: string | null;
  } | null;
  // Execution counts
  plannedCount: number;
  completedCount: number;
  remainingCount: number;
  overdueCount: number;
  completionPercent: number;
  totalFocusedMinutes: number;
  activeDaysCount: number;
  // Tasks & Tracks
  tasks: WeeklyTaskItem[];
  tracks: WeeklyTrackSummary[];
  // 7-day timeline
  days: WeeklyDayExecution[];
  // Milestones & Review
  milestones: WeeklyMilestoneItem[];
  review: WeeklyReviewSummary | null;
  // Navigation & carry forward
  previousWeekId: string | null;
  nextWeekId: string | null;
  allWeeks: WeeklyNavOption[];
  upcomingWeeks: Array<{ id: string; label: string; weekStart: string }>;
};

type RawGoal = { id: string; title: string };
type RawYear = { id: string; year: number; title: string; goal_id: string | null };
type RawPhase = { id: string; roadmap_year_id: string; title: string };
type RawMonth = { id: string; roadmap_phase_id: string; month_start: string; title: string };
type RawWeek = { id: string; roadmap_month_id: string; week_start: string; week_end: string | null; objective: string | null; status: string };
type RawTask = { id: string; title: string; description: string | null; status: string; priority: number; due_on: string | null; scheduled_for: string | null; estimated_minutes: number | null; roadmap_week_id: string | null; track: string | null; import_key: string | null; created_at: string };
type RawCompletion = { task_id: string; completed_on: string };
type RawFocus = { id: string; duration_seconds: number; started_at: string; task_id: string | null };
type RawReport = { id: string; report_date: string; wins: string | null; blockers: string | null; energy: number | null };
type RawMilestone = { id: string; title: string; description: string | null; due_on: string | null; achieved_on: string | null; status: string; track: string | null };
type RawReview = { id: string; week_start: string; summary: string | null; lessons: string | null; next_focus: string | null };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TRACK_NAMES: TodayTrack[] = ["E-Commerce", "YouTube Automation", "Operating System"];

function emptyWeeklyCommand(today: string, error: string | null = null): WeeklyCommandData {
  return {
    authenticated: false,
    error,
    today,
    week: null,
    roadmap: null,
    plannedCount: 0,
    completedCount: 0,
    remainingCount: 0,
    overdueCount: 0,
    completionPercent: 0,
    totalFocusedMinutes: 0,
    activeDaysCount: 0,
    tasks: [],
    tracks: TRACK_NAMES.map((track) => ({ track, planned: 0, completed: 0, remaining: 0, overdue: 0, completionPercent: 0 })),
    days: [],
    milestones: [],
    review: null,
    previousWeekId: null,
    nextWeekId: null,
    allWeeks: [],
    upcomingWeeks: [],
  };
}

export async function getWeeklyCommandData(requestedWeekId?: string): Promise<WeeklyCommandData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyWeeklyCommand(fallbackToday);
  const { supabase, userId } = access;

  // 1. Get user profile timezone
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  const today = dateInTimezone(profile?.timezone || "UTC");

  // 2. Load roadmap structure
  const [goalsResult, yearsResult, phasesResult, monthsResult, weeksResult] = await Promise.all([
    supabase.from("goals").select("id, title").eq("user_id", userId).order("created_at", { ascending: true }).limit(50),
    supabase.from("roadmap_years").select("id, year, title, goal_id").eq("user_id", userId).order("year", { ascending: true }).limit(50),
    supabase.from("roadmap_phases").select("id, roadmap_year_id, title").eq("user_id", userId).order("sort_order", { ascending: true }).limit(100),
    supabase.from("roadmap_months").select("id, roadmap_phase_id, month_start, title").eq("user_id", userId).order("month_start", { ascending: true }).limit(200),
    supabase.from("roadmap_weeks").select("id, roadmap_month_id, week_start, week_end, objective, status").eq("user_id", userId).order("week_start", { ascending: true }).limit(500),
  ]);

  const loadError = [goalsResult.error, yearsResult.error, phasesResult.error, monthsResult.error, weeksResult.error].find(Boolean);
  if (loadError) return emptyWeeklyCommand(today, "We could not load weekly roadmap context.");

  const allWeeksRaw = (weeksResult.data ?? []) as RawWeek[];
  if (allWeeksRaw.length === 0) return emptyWeeklyCommand(today);

  // 3. Find target week
  let selectedWeekRaw: RawWeek | null = null;
  if (requestedWeekId) {
    selectedWeekRaw = allWeeksRaw.find((w) => w.id === requestedWeekId || w.week_start === requestedWeekId) ?? null;
  }
  if (!selectedWeekRaw) {
    // Try matching week covering today
    selectedWeekRaw = allWeeksRaw.find((w) => {
      const start = w.week_start;
      const end = w.week_end ?? weekEndFor(start);
      return today >= start && today <= end;
    }) ?? null;
  }
  if (!selectedWeekRaw) {
    // Try first active week
    selectedWeekRaw = allWeeksRaw.find((w) => w.status === "active") ?? allWeeksRaw[0];
  }

  const weekStart = selectedWeekRaw.week_start;
  const weekEnd = selectedWeekRaw.week_end ?? weekEndFor(weekStart);

  // 4. Determine navigation (previous, next, all options)
  const currentIndex = allWeeksRaw.findIndex((w) => w.id === selectedWeekRaw?.id);
  const previousWeekId = currentIndex > 0 ? allWeeksRaw[currentIndex - 1].id : null;
  const nextWeekId = currentIndex >= 0 && currentIndex < allWeeksRaw.length - 1 ? allWeeksRaw[currentIndex + 1].id : null;

  const allWeeks: WeeklyNavOption[] = allWeeksRaw.map((w) => {
    const end = w.week_end ?? weekEndFor(w.week_start);
    const label = `${w.week_start} → ${end}${w.objective ? ` · ${w.objective}` : ""}`;
    return {
      id: w.id,
      weekStart: w.week_start,
      weekEnd: end,
      objective: w.objective,
      status: w.status,
      label,
    };
  });

  const upcomingWeeks = allWeeksRaw
    .filter((w) => w.id !== selectedWeekRaw?.id && w.week_start >= weekStart)
    .map((w) => ({
      id: w.id,
      label: `${w.week_start} (${w.objective ? w.objective.slice(0, 36) + "..." : "Week"})`,
      weekStart: w.week_start,
    }));

  // 5. Query execution data for this week
  const [tasksResult, completionsResult, focusResult, reportsResult, milestonesResult, reviewResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_on, scheduled_for, estimated_minutes, roadmap_week_id, track, import_key, created_at")
      .eq("user_id", userId)
      .or(`roadmap_week_id.eq.${selectedWeekRaw.id},and(due_on.gte.${weekStart},due_on.lte.${weekEnd}),and(scheduled_for.gte.${weekStart},scheduled_for.lte.${weekEnd})`),
    supabase
      .from("task_completions")
      .select("task_id, completed_on")
      .eq("user_id", userId)
      .gte("completed_on", weekStart)
      .lte("completed_on", weekEnd),
    supabase
      .from("focus_sessions")
      .select("id, duration_seconds, started_at, task_id")
      .eq("user_id", userId)
      .gte("started_at", `${weekStart}T00:00:00`)
      .lte("started_at", `${weekEnd}T23:59:59`),
    supabase
      .from("daily_reports")
      .select("id, report_date, wins, blockers, energy")
      .eq("user_id", userId)
      .gte("report_date", weekStart)
      .lte("report_date", weekEnd),
    supabase
      .from("milestones")
      .select("id, title, description, due_on, achieved_on, status, track")
      .eq("user_id", userId)
      .gte("due_on", weekStart)
      .lte("due_on", weekEnd)
      .order("due_on", { ascending: true }),
    supabase
      .from("weekly_reviews")
      .select("id, week_start, summary, lessons, next_focus")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle(),
  ]);

  const rawTasks = (tasksResult.data ?? []) as RawTask[];
  const rawCompletions = (completionsResult.data ?? []) as RawCompletion[];
  const rawFocus = (focusResult.data ?? []) as RawFocus[];
  const rawReports = (reportsResult.data ?? []) as RawReport[];
  const rawMilestones = (milestonesResult.data ?? []) as RawMilestone[];
  const rawReview = (reviewResult.data ?? null) as RawReview | null;

  // Completion lookup by task
  const completionDatesByTask = new Map<string, string[]>();
  for (const c of rawCompletions) {
    const list = completionDatesByTask.get(c.task_id) ?? [];
    list.push(c.completed_on);
    completionDatesByTask.set(c.task_id, list);
  }

  // Deduplicate and process tasks
  const taskMap = new Map<string, WeeklyTaskItem>();
  for (const t of rawTasks) {
    const dates = completionDatesByTask.get(t.id) ?? [];
    const completedInWeek = dates.length > 0 || t.status === "completed";
    const completedOn = dates[0] ?? null;
    const isOverdue = Boolean(t.due_on && t.due_on < today && !completedInWeek);
    taskMap.set(t.id, {
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status as WeeklyTaskItem["status"],
      dueOn: t.due_on,
      scheduledFor: t.scheduled_for,
      estimatedMinutes: t.estimated_minutes,
      roadmapWeekId: t.roadmap_week_id,
      track: inferTrack(t),
      completedInWeek,
      completedOn,
      isOverdue,
    });
  }

  const tasks = Array.from(taskMap.values()).sort((a, b) => {
    if (a.completedInWeek !== b.completedInWeek) return a.completedInWeek ? 1 : -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aDue = a.dueOn ?? "9999-12-31";
    const bDue = b.dueOn ?? "9999-12-31";
    return aDue.localeCompare(bDue);
  });

  const plannedCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completedInWeek).length;
  const remainingCount = plannedCount - completedCount;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const completionPercent = plannedCount > 0 ? clampPercent((completedCount / plannedCount) * 100) : 0;

  // Focus time sum
  const totalFocusedSeconds = rawFocus.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalFocusedMinutes = Math.round(totalFocusedSeconds / 60);

  // Track breakdown
  const tracks: WeeklyTrackSummary[] = TRACK_NAMES.map((track) => {
    const trackTasks = tasks.filter((t) => t.track === track);
    const planned = trackTasks.length;
    const completed = trackTasks.filter((t) => t.completedInWeek).length;
    const remaining = planned - completed;
    const overdue = trackTasks.filter((t) => t.isOverdue).length;
    const percent = planned > 0 ? clampPercent((completed / planned) * 100) : 0;
    return { track, planned, completed, remaining, overdue, completionPercent: percent };
  });

  // Daily reports map
  const reportsByDate = new Map(rawReports.map((r) => [r.report_date, r]));

  // Focus seconds by date
  const focusByDate = new Map<string, number>();
  for (const f of rawFocus) {
    const dateKey = f.started_at ? f.started_at.slice(0, 10) : "";
    if (dateKey) {
      focusByDate.set(dateKey, (focusByDate.get(dateKey) ?? 0) + (f.duration_seconds || 0));
    }
  }

  // Active days count (days in week with at least 1 completion)
  const activeDaysSet = new Set(rawCompletions.map((c) => c.completed_on));
  const activeDaysCount = activeDaysSet.size;

  // 7-day execution timeline
  const days: WeeklyDayExecution[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = shiftDate(weekStart, i);
    const dayName = DAY_NAMES[i];
    const isToday = dayDate === today;
    const isPast = dayDate < today;
    const isFuture = dayDate > today;

    // Tasks relevant to this day: scheduled, due, or completed on this date
    const dayTasks = tasks.filter((t) => {
      if (t.completedOn === dayDate) return true;
      if (t.scheduledFor === dayDate) return true;
      if (t.dueOn === dayDate) return true;
      return false;
    });

    const dayPlanned = dayTasks.length;
    // Only count completions actually recorded on this specific date.
    // Tasks completed in the week without a completion date cannot be
    // attributed to a day and are counted only in the week total.
    const dayCompleted = dayTasks.filter((t) => t.completedOn === dayDate).length;
    const dayRemaining = Math.max(0, dayPlanned - dayCompleted);
    const dayFocusedSec = focusByDate.get(dayDate) ?? 0;
    const dayReport = reportsByDate.get(dayDate) ?? null;

    // Format short date (e.g. "Sep 28")
    const shortDate = formatDate(dayDate)?.split(",")[0] ?? dayDate;

    days.push({
      date: dayDate,
      dayName,
      shortDate,
      isToday,
      isPast,
      isFuture,
      plannedCount: dayPlanned,
      completedCount: dayCompleted,
      remainingCount: dayRemaining,
      focusedMinutes: Math.round(dayFocusedSec / 60),
      dailyReport: dayReport ? { id: dayReport.id, wins: dayReport.wins, blockers: dayReport.blockers, energy: dayReport.energy } : null,
      tasks: dayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        track: t.track,
        priority: t.priority,
        completed: t.completedInWeek,
      })),
    });
  }

  // Milestones
  const milestones: WeeklyMilestoneItem[] = rawMilestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    dueOn: m.due_on,
    achievedOn: m.achieved_on,
    status: m.status,
    track: m.track,
  }));

  // Review
  const review: WeeklyReviewSummary = {
    id: rawReview?.id ?? null,
    weekStart,
    summary: rawReview?.summary ?? null,
    lessons: rawReview?.lessons ?? null,
    nextFocus: rawReview?.next_focus ?? null,
    isReviewed: Boolean(rawReview?.summary || rawReview?.lessons || rawReview?.next_focus),
  };

  // Roadmap breadcrumb hierarchy
  const rawMonths = (monthsResult.data ?? []) as RawMonth[];
  const rawPhases = (phasesResult.data ?? []) as RawPhase[];
  const rawYears = (yearsResult.data ?? []) as RawYear[];
  const rawGoals = (goalsResult.data ?? []) as RawGoal[];

  const parentMonth = rawMonths.find((m) => m.id === selectedWeekRaw?.roadmap_month_id);
  const parentPhase = parentMonth ? rawPhases.find((p) => p.id === parentMonth.roadmap_phase_id) : null;
  const parentYear = parentPhase ? rawYears.find((y) => y.id === parentPhase.roadmap_year_id) : null;
  const parentGoal = parentYear?.goal_id ? rawGoals.find((g) => g.id === parentYear.goal_id) : null;

  const roadmap = {
    goalTitle: parentGoal?.title ?? null,
    year: parentYear?.year ?? null,
    yearTitle: parentYear?.title ?? null,
    phaseTitle: parentPhase?.title ?? null,
    monthTitle: parentMonth?.title ?? null,
    monthStart: parentMonth?.month_start ?? null,
  };

  return {
    authenticated: true,
    error: null,
    today,
    week: {
      id: selectedWeekRaw.id,
      weekStart,
      weekEnd,
      objective: selectedWeekRaw.objective,
      status: selectedWeekRaw.status,
      roadmapMonthId: selectedWeekRaw.roadmap_month_id,
    },
    roadmap,
    plannedCount,
    completedCount,
    remainingCount,
    overdueCount,
    completionPercent,
    totalFocusedMinutes,
    activeDaysCount,
    tasks,
    tracks,
    days,
    milestones,
    review,
    previousWeekId,
    nextWeekId,
    allWeeks,
    upcomingWeeks,
  };
}
