import { getAuthorizedAccess } from "@/lib/auth/server";

export type TaskStatus = "inbox" | "planned" | "in_progress" | "completed" | "cancelled";

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: TaskStatus;
  dueOn: string | null;
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  roadmapWeekId: string | null;
  createdAt: string;
  completedToday: boolean;
  completionDates: string[];
};

export type TasksData = {
  authenticated: boolean;
  error: string | null;
  today: string;
  tasks: TaskRecord[];
  roadmapWeeks: Array<{ id: string; label: string }>;
};

type RawTask = { id: string; title: string; description: string | null; priority: number; status: TaskStatus; due_on: string | null; scheduled_for: string | null; estimated_minutes: number | null; roadmap_week_id: string | null; created_at: string };
type RawCompletion = { task_id: string; completed_on: string };

function dateInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function getTasksData(): Promise<TasksData> {
  const access = await getAuthorizedAccess();
  const fallbackToday = dateInTimezone("UTC");
  if (!access) return { authenticated: false, error: null, today: fallbackToday, tasks: [], roadmapWeeks: [] };
  const { supabase, userId } = access;

  const [{ data: profile }, { data: rawTasks, error: tasksError }, { data: rawCompletions, error: completionsError }, { data: rawWeeks, error: weeksError }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle<{ timezone: string }>(),
    supabase.from("tasks").select("id, title, description, priority, status, due_on, scheduled_for, estimated_minutes, roadmap_week_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("task_completions").select("task_id, completed_on").eq("user_id", userId).order("completed_on", { ascending: false }).limit(2000),
    supabase.from("roadmap_weeks").select("id, week_start, objective").eq("user_id", userId).order("week_start", { ascending: false }).limit(100),
  ]);
  if (tasksError || completionsError || weeksError) return { authenticated: true, error: "We could not load your tasks. Please try again.", today: fallbackToday, tasks: [], roadmapWeeks: [] };

  const today = dateInTimezone(profile?.timezone || "UTC");
  const completionsByTask = new Map<string, string[]>();
  for (const completion of (rawCompletions ?? []) as RawCompletion[]) {
    const dates = completionsByTask.get(completion.task_id) ?? [];
    dates.push(completion.completed_on);
    completionsByTask.set(completion.task_id, dates);
  }

  return {
    authenticated: true,
    error: null,
    today,
    roadmapWeeks: ((rawWeeks ?? []) as Array<{ id: string; week_start: string; objective: string | null }>).map((week) => ({ id: week.id, label: `${week.week_start}${week.objective ? ` · ${week.objective}` : ""}` })),
    tasks: ((rawTasks ?? []) as RawTask[]).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueOn: task.due_on,
      scheduledFor: task.scheduled_for,
      estimatedMinutes: task.estimated_minutes,
      roadmapWeekId: task.roadmap_week_id,
      createdAt: task.created_at,
      completionDates: completionsByTask.get(task.id) ?? [],
      completedToday: (completionsByTask.get(task.id) ?? []).includes(today) || task.status === "completed",
    })),
  };
}
