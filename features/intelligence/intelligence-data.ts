import { getAuthorizedAccess } from "@/lib/auth/server";
import { clampPercent, dateInTimezone, monthEndFor, monthStartFor, shiftDate, weekEndFor, weekStartFor } from "@/lib/dates";

export type IntelligencePeriod = "current-week" | "previous-week" | "current-month" | "previous-month";

export type TrackBreakdown = {
  track: string;
  planned: number;
  completed: number;
  incomplete: number;
  overdue: number;
  completionPercent: number;
  milestones: Array<{ title: string; dueOn: string | null; status: string }>;
};

export type DecisionNote = {
  id: string;
  observation: string | null;
  evidence: string | null;
  decision: string | null;
  reason: string | null;
  followUp: string | null;
  createdAt: string;
};

export type IntelligenceData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  period: IntelligencePeriod;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  // Execution overview
  planned: number;
  completed: number;
  incomplete: number;
  overdue: number;
  completionPercent: number;
  focusedMinutes: number | null;
  dailyMinimumTasks: number;
  dailyMinimumComplete: boolean;
  // Track breakdown
  tracks: TrackBreakdown[];
  // Roadmap context
  roadmap: {
    goalTitle: string | null;
    year: number | null;
    yearTitle: string | null;
    phaseTitle: string | null;
    monthTitle: string | null;
    weekTitle: string | null;
    weekObjective: string | null;
  } | null;
  // Milestones
  activeMilestones: Array<{ title: string; dueOn: string | null; status: string; track: string | null }>;
  // Business evidence
  businessMetrics: Array<{ name: string; value: number; unit: string | null; metricDate: string }>;
  youtubeMetrics: Array<{ name: string; value: number; unit: string | null; metricDate: string }>;
  youtubePublishedCount: number;
  // Decision notes
  decisionNotes: DecisionNote[];
};

type RawTask = { id: string; title: string; status: string; due_on: string | null; scheduled_for: string | null; roadmap_week_id: string | null; track: string | null; import_key: string | null };
type RawCompletion = { task_id: string; completed_on: string };
type RawFocus = { duration_seconds: number; started_at: string };
type RawMilestone = { title: string; due_on: string | null; status: string; track: string | null };
type RawBusinessMetric = { name: string; value: number; unit: string | null; metric_date: string };
type RawYoutubeMetric = { name: string; value: number; unit: string | null; metric_date: string };
type RawNote = { id: string; observation: string | null; evidence: string | null; decision: string | null; reason: string | null; follow_up: string | null; created_at: string };

const TRACKS = ["E-Commerce", "YouTube Automation", "Operating System"] as const;

function inferTrack(task: RawTask): string {
  if (task.track) return task.track;
  const key = task.import_key ?? "";
  if (key.includes("task-ec")) return "E-Commerce";
  if (key.includes("task-yt")) return "YouTube Automation";
  if (key.includes("task-os")) return "Operating System";
  return "Other";
}

function periodRange(period: IntelligencePeriod, today: string): { start: string; end: string; label: string } {
  if (period === "current-week") {
    const start = weekStartFor(today);
    return { start, end: weekEndFor(start), label: "Current week" };
  }
  if (period === "previous-week") {
    const start = weekStartFor(shiftDate(today, -7));
    return { start, end: weekEndFor(start), label: "Previous week" };
  }
  if (period === "current-month") {
    const start = monthStartFor(today);
    return { start, end: monthEndFor(start), label: "Current month" };
  }
  const start = monthStartFor(shiftDate(monthStartFor(today), -1));
  return { start, end: monthEndFor(start), label: "Previous month" };
}

function emptyIntelligence(period: IntelligencePeriod, today: string, error: string | null = null): IntelligenceData {
  const range = periodRange(period, today);
  return {
    authenticated: false,
    error,
    today,
    period,
    periodLabel: range.label,
    periodStart: range.start,
    periodEnd: range.end,
    planned: 0,
    completed: 0,
    incomplete: 0,
    overdue: 0,
    completionPercent: 0,
    focusedMinutes: null,
    dailyMinimumTasks: 1,
    dailyMinimumComplete: false,
    tracks: [],
    roadmap: null,
    activeMilestones: [],
    businessMetrics: [],
    youtubeMetrics: [],
    youtubePublishedCount: 0,
    decisionNotes: [],
  };
}

export async function getIntelligenceData(period: IntelligencePeriod): Promise<IntelligenceData> {
  const fallbackToday = dateInTimezone("UTC");
  const access = await getAuthorizedAccess();
  if (!access) return emptyIntelligence(period, fallbackToday);
  const { supabase, userId } = access;

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>();
  const today = dateInTimezone(profile?.timezone || "UTC");
  const range = periodRange(period, today);

  const [tasksResult, completionsResult, focusResult, milestonesResult, businessResult, youtubeMetricsResult, youtubeVideosResult, settingsResult, notesResult, goalResult, yearResult] = await Promise.all([
    supabase.from("tasks").select("id, title, status, due_on, scheduled_for, roadmap_week_id, track, import_key").eq("user_id", userId).limit(3000),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).limit(6000),
    supabase.from("focus_sessions").select("duration_seconds, started_at").eq("user_id", userId).gte("started_at", `${range.start}T00:00:00`).lte("started_at", `${range.end}T23:59:59`),
    supabase.from("milestones").select("title, due_on, status, track").eq("user_id", userId).order("due_on", { ascending: true, nullsFirst: false }).limit(200),
    supabase.from("business_metrics").select("name, value, unit, metric_date").eq("user_id", userId).gte("metric_date", range.start).lte("metric_date", range.end).order("metric_date", { ascending: false }).limit(200),
    supabase.from("youtube_metrics").select("name, value, unit, metric_date").eq("user_id", userId).gte("metric_date", range.start).lte("metric_date", range.end).order("metric_date", { ascending: false }).limit(200),
    supabase.from("youtube_videos").select("id, stage").eq("user_id", userId).eq("stage", "published"),
    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle(),
    supabase.from("decision_notes").select("id, observation, evidence, decision, reason, follow_up, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("goals").select("title").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle<{ title: string }>(),
    supabase.from("roadmap_years").select("year, title, status, id").eq("user_id", userId).eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError = [tasksResult.error, completionsResult.error, focusResult.error, milestonesResult.error, businessResult.error, youtubeMetricsResult.error, youtubeVideosResult.error, settingsResult.error, notesResult.error, goalResult.error, yearResult.error].find(Boolean);
  if (firstError) return emptyIntelligence(period, today, "We could not load your intelligence view. Please try again.");

  const tasks = (tasksResult.data ?? []) as RawTask[];
  const completions = (completionsResult.data ?? []) as RawCompletion[];
  const focusRows = (focusResult.data ?? []) as RawFocus[];
  const milestones = (milestonesResult.data ?? []) as RawMilestone[];

  const completionDatesByTask = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = completionDatesByTask.get(completion.task_id) ?? new Set<string>();
    set.add(completion.completed_on);
    completionDatesByTask.set(completion.task_id, set);
  }

  const isCompletedInRange = (task: RawTask) => {
    const dates = completionDatesByTask.get(task.id);
    if (dates) for (const date of dates) if (date >= range.start && date <= range.end) return true;
    return task.status === "completed";
  };

  // Tasks relevant to the period: linked to a week in range, or due/scheduled in range.
  const periodTasks = tasks.filter((task) => {
    if (task.due_on && task.due_on >= range.start && task.due_on <= range.end) return true;
    if (task.scheduled_for && task.scheduled_for >= range.start && task.scheduled_for <= range.end) return true;
    return false;
  });

  const completed = periodTasks.filter(isCompletedInRange).length;
  const planned = periodTasks.length;
  const incomplete = planned - completed;
  const overdue = periodTasks.filter((task) => !isCompletedInRange(task) && task.due_on && task.due_on < today).length;

  const focusedSeconds = focusRows.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0);
  const focusedMinutes = focusedSeconds > 0 ? Math.round(focusedSeconds / 60) : null;

  const settings = (settingsResult.data?.settings ?? {}) as Record<string, unknown>;
  const configuredMinimum = Number(settings.daily_minimum_tasks);
  const dailyMinimumTasks = Number.isInteger(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 1;
  const dailyMinimumComplete = completed >= dailyMinimumTasks;

  // Track breakdown.
  const tracks: TrackBreakdown[] = TRACKS.map((track) => {
    const trackTasks = periodTasks.filter((task) => inferTrack(task) === track);
    const trackCompleted = trackTasks.filter(isCompletedInRange).length;
    const trackOverdue = trackTasks.filter((task) => !isCompletedInRange(task) && task.due_on && task.due_on < today).length;
    const trackMilestones = milestones.filter((milestone) => milestone.track === track).map((milestone) => ({ title: milestone.title, dueOn: milestone.due_on, status: milestone.status }));
    return {
      track,
      planned: trackTasks.length,
      completed: trackCompleted,
      incomplete: trackTasks.length - trackCompleted,
      overdue: trackOverdue,
      completionPercent: trackTasks.length > 0 ? clampPercent((trackCompleted / trackTasks.length) * 100) : 0,
      milestones: trackMilestones,
    };
  });

  // Roadmap context (active year → phase → month → week).
  const yearRow = yearResult.data as { id: string; year: number; title: string; status: string } | null;
  let roadmap: IntelligenceData["roadmap"] = null;
  if (yearRow) {
    const { data: phase } = await supabase.from("roadmap_phases").select("id, title").eq("user_id", userId).eq("roadmap_year_id", yearRow.id).eq("status", "active").order("sort_order", { ascending: true }).limit(1).maybeSingle();
    let monthTitle: string | null = null;
    let weekTitle: string | null = null;
    let weekObjective: string | null = null;
    if (phase) {
      const { data: month } = await supabase.from("roadmap_months").select("id, title").eq("user_id", userId).eq("roadmap_phase_id", phase.id).eq("status", "active").order("month_start", { ascending: false }).limit(1).maybeSingle();
      if (month) {
        monthTitle = month.title;
        const { data: week } = await supabase.from("roadmap_weeks").select("objective, week_start").eq("user_id", userId).eq("roadmap_month_id", month.id).eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
        if (week) {
          weekTitle = week.objective || `Week of ${week.week_start}`;
          weekObjective = week.objective;
        }
      }
    }
    roadmap = { goalTitle: goalResult.data?.title ?? null, year: yearRow.year, yearTitle: yearRow.title, phaseTitle: phase?.title ?? null, monthTitle, weekTitle, weekObjective };
  }

  const activeMilestones = milestones.filter((milestone) => milestone.status === "planned" || milestone.status === "achieved").map((milestone) => ({ title: milestone.title, dueOn: milestone.due_on, status: milestone.status, track: milestone.track }));

  return {
    authenticated: true,
    error: null,
    today,
    period,
    periodLabel: range.label,
    periodStart: range.start,
    periodEnd: range.end,
    planned,
    completed,
    incomplete,
    overdue,
    completionPercent: planned > 0 ? clampPercent((completed / planned) * 100) : 0,
    focusedMinutes,
    dailyMinimumTasks,
    dailyMinimumComplete,
    tracks,
    roadmap,
    activeMilestones,
    businessMetrics: ((businessResult.data ?? []) as RawBusinessMetric[]).map((metric) => ({ name: metric.name, value: metric.value, unit: metric.unit, metricDate: metric.metric_date })),
    youtubeMetrics: ((youtubeMetricsResult.data ?? []) as RawYoutubeMetric[]).map((metric) => ({ name: metric.name, value: metric.value, unit: metric.unit, metricDate: metric.metric_date })),
    youtubePublishedCount: (youtubeVideosResult.data ?? []).length,
    decisionNotes: ((notesResult.data ?? []) as RawNote[]).map((note) => ({ id: note.id, observation: note.observation, evidence: note.evidence, decision: note.decision, reason: note.reason, followUp: note.follow_up, createdAt: note.created_at })),
  };
}
