import { getAuthorizedAccess } from "@/lib/auth/server";
import { calculateStreaks } from "@/lib/streak";
import { getActiveCommitment, getDailyMotivation, type Commitment, type MotivationItem } from "@/features/motivation/motivation-data";
import { getLiveMotivationData, markLiveMotivationShown, selectDailyLiveMotivation, type LiveMotivationItem } from "@/features/motivation/live-motivation-data";

export type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  status: "inbox" | "planned" | "in_progress" | "completed" | "cancelled";
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  estimatedMinutes: null;
  completedToday: boolean;
};

export type DashboardData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  displayDate: string;
  displayName: string | null;
  state: "NEW" | "ACTIVE" | "STREAK_RISK" | "COMPLETED";
  tasks: DashboardTask[];
  completedTaskCount: number;
  taskCount: number;
  completionPercent: number;
  currentStreak: number;
  longestStreak: number;
  productiveDays: number;
  dailyMinimumTasks: number;
  dailyMinimumComplete: boolean;
  focusedMinutes: null;
  mostImportantTaskId: string | null;
  roadmap: {
    goalTitle: string | null;
    year: number;
    yearTitle: string;
    phaseTitle: string | null;
    monthTitle: string | null;
    weekTitle: string | null;
    objective: string | null;
    status: string;
  } | null;
  businessMetrics: Array<{ name: string; value: number; unit: string | null; metricDate: string }>;
  latestMilestone: { title: string; description: string | null; achievedOn: string | null; status: string } | null;
  dailyMotivation: MotivationItem | null;
  activeCommitment: Commitment | null;
  liveMotivation: LiveMotivationItem | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: DashboardTask["status"];
  priority: number;
  due_on: string | null;
  scheduled_for: string | null;
  created_at: string;
};

type CompletionRow = { task_id: string; completed_on: string };

type ProfileRow = { display_name: string | null; timezone: string };

function dateInTimezone(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function emptyDashboard(today: string, displayDate: string, error: string | null = null): DashboardData {
  return {
    authenticated: false,
    error,
    today,
    displayDate,
    displayName: null,
    state: "NEW",
    tasks: [],
    completedTaskCount: 0,
    taskCount: 0,
    completionPercent: 0,
    currentStreak: 0,
    longestStreak: 0,
    productiveDays: 0,
    dailyMinimumTasks: 1,
    dailyMinimumComplete: false,
    focusedMinutes: null,
    mostImportantTaskId: null,
    roadmap: null,
    businessMetrics: [],
    latestMilestone: null,
    dailyMotivation: null,
    activeCommitment: null,
    liveMotivation: null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const fallbackDate = dateInTimezone("UTC");
  const fallback = emptyDashboard(fallbackDate, new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(new Date()));
  const access = await getAuthorizedAccess();
  if (!access) return fallback;
  const { supabase, userId } = access;

  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name, timezone").eq("id", userId).maybeSingle<ProfileRow>();
  if (profileError) return emptyDashboard(fallbackDate, fallback.displayDate, "We could not load your profile. Please try again.");

  const timeZone = profile?.timezone || "UTC";
  const today = dateInTimezone(timeZone);
  const displayDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone }).format(new Date());

  const [todayCompletionsResult, allCompletionsResult, settingsResult, roadmapGoalResult, roadmapYearResult, businessResult, milestoneResult, motivationItemsResult, commitmentsResult, liveMotivationData] = await Promise.all([
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).eq("completed_on", today),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).order("completed_on", { ascending: true }).limit(2000),
    supabase.from("app_settings").select("settings").eq("user_id", userId).maybeSingle(),
    supabase.from("goals").select("title").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle<{ title: string }>(),
    supabase.from("roadmap_years").select("year, title, objective, status, id").eq("user_id", userId).eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("business_metrics").select("name, value, unit, metric_date").eq("user_id", userId).order("metric_date", { ascending: false }).order("created_at", { ascending: false }).limit(4),
    supabase.from("milestones").select("title, description, achieved_on, status").eq("user_id", userId).order("achieved_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("motivation_items").select("id, title, content, kind, is_active, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("commitments").select("id, title, description, cadence, status, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    getLiveMotivationData(),
  ]);

  const firstError = [todayCompletionsResult.error, allCompletionsResult.error, settingsResult.error, roadmapGoalResult.error, roadmapYearResult.error, businessResult.error, milestoneResult.error].find(Boolean);
  if (firstError) return emptyDashboard(today, displayDate, "We could not load your dashboard. Please try again.");

  const todayCompletions = (todayCompletionsResult.data ?? []) as CompletionRow[];
  const allCompletions = (allCompletionsResult.data ?? []) as CompletionRow[];
  const completedTaskIds = new Set(todayCompletions.map((completion) => completion.task_id));
  const taskFilter = [`due_on.eq.${today}`, `scheduled_for.eq.${today}`, "status.eq.in_progress"];
  if (completedTaskIds.size > 0) taskFilter.push(`id.in.(${[...completedTaskIds].join(",")})`);

  const { data: taskRows, error: tasksError } = await supabase.from("tasks").select("id, title, description, status, priority, due_on, scheduled_for, created_at").eq("user_id", userId).or(taskFilter.join(","));
  if (tasksError) return emptyDashboard(today, displayDate, "We could not load today’s tasks. Please try again.");

  const tasks = ((taskRows ?? []) as TaskRow[]).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueOn: task.due_on,
    scheduledFor: task.scheduled_for,
    estimatedMinutes: null,
    completedToday: completedTaskIds.has(task.id) || task.status === "completed",
  }));
  const orderedTasks = tasks.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    const leftOverdue = left.dueOn !== null && left.dueOn < today;
    const rightOverdue = right.dueOn !== null && right.dueOn < today;
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
    return (left.dueOn ?? "9999-12-31").localeCompare(right.dueOn ?? "9999-12-31");
  });

  const completedTaskCount = todayCompletions.length;
  const taskCount = orderedTasks.length;
  const completionPercent = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
  const streaks = calculateStreaks(allCompletions.map((completion) => completion.completed_on), today);
  const settings = (settingsResult.data?.settings ?? {}) as Record<string, unknown>;
  const configuredMinimum = Number(settings.daily_minimum_tasks);
  const dailyMinimumTasks = Number.isInteger(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 1;
  const dailyMinimumComplete = completedTaskCount >= dailyMinimumTasks;
  const roadmapYear = roadmapYearResult.data as { id: string; year: number; title: string; objective: string | null; status: string } | null;
  let roadmap: DashboardData["roadmap"] = roadmapYear ? { goalTitle: roadmapGoalResult.data?.title ?? null, year: roadmapYear.year, yearTitle: roadmapYear.title, phaseTitle: null, monthTitle: null, weekTitle: null, objective: roadmapYear.objective, status: roadmapYear.status } : null;

  if (roadmapYear) {
    const { data: phase } = await supabase.from("roadmap_phases").select("id, title, objective, status").eq("user_id", userId).eq("roadmap_year_id", roadmapYear.id).eq("status", "active").order("sort_order", { ascending: true }).limit(1).maybeSingle();
    if (phase) {
      const { data: month } = await supabase.from("roadmap_months").select("id, title").eq("user_id", userId).eq("roadmap_phase_id", phase.id).eq("status", "active").order("month_start", { ascending: false }).limit(1).maybeSingle();
      let weekTitle: string | null = null;
      if (month) {
        const { data: week } = await supabase.from("roadmap_weeks").select("objective, week_start").eq("user_id", userId).eq("roadmap_month_id", month.id).eq("status", "active").order("week_start", { ascending: false }).limit(1).maybeSingle();
        weekTitle = week?.objective || (week?.week_start ? `Week of ${week.week_start}` : null);
      }
      roadmap = { goalTitle: roadmapGoalResult.data?.title ?? null, year: roadmapYear.year, yearTitle: roadmapYear.title, phaseTitle: phase.title, monthTitle: month?.title ?? null, weekTitle, objective: phase.objective ?? roadmapYear.objective, status: roadmapYear.status };
    }
  }

  let state: DashboardData["state"] = "NEW";
  if (dailyMinimumComplete) state = "COMPLETED";
  else if (streaks.currentStreak > 0) state = "STREAK_RISK";
  else if (taskCount > 0 || allCompletions.length > 0) state = "ACTIVE";

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
  const liveMotivation = liveMotivationData.authenticated && !liveMotivationData.error
    ? selectDailyLiveMotivation(liveMotivationData.items, liveMotivationData.shownHistory, today)
    : null;

  // Record shown history when a live motivation item is actually selected
  if (liveMotivation) {
    markLiveMotivationShown(liveMotivation.id, today).catch(() => {
      // Silently fail — shown history is best-effort
    });
  }

  return {
    authenticated: true,
    error: null,
    today,
    displayDate,
    displayName: profile?.display_name?.trim() || null,
    state,
    tasks: orderedTasks,
    completedTaskCount,
    taskCount,
    completionPercent,
    ...streaks,
    dailyMinimumTasks,
    dailyMinimumComplete,
    focusedMinutes: null,
    mostImportantTaskId: orderedTasks[0]?.id ?? null,
    roadmap,
    businessMetrics: ((businessResult.data ?? []) as Array<{ name: string; value: number; unit: string | null; metric_date: string }>).map((metric) => ({ name: metric.name, value: metric.value, unit: metric.unit, metricDate: metric.metric_date })),
    latestMilestone: milestoneResult.data ? { title: milestoneResult.data.title, description: milestoneResult.data.description, achievedOn: milestoneResult.data.achieved_on, status: milestoneResult.data.status } : null,
    dailyMotivation,
    activeCommitment,
    liveMotivation,
  };
}
