"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { createTaskForCurrentUser } from "@/lib/tasks/task-operations";

type ActionResult = { ok: true; weekId?: string } | { ok: false; error: string };

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const tracks = ["E-Commerce", "YouTube Automation", "Operating System"] as const;

export type WeekTaskInput = {
  title: string;
  description?: string;
  track?: string;
  priority?: number;
  dueOn?: string;
  estimatedMinutes?: number;
};

export type WeekMilestoneInput = {
  title: string;
  dueOn?: string;
  track?: string;
};

export type CreateWeekInput = {
  roadmapMonthId: string;
  weekStart: string;
  weekEnd?: string;
  objective?: string;
  status?: string;
  tasks?: WeekTaskInput[];
  milestones?: WeekMilestoneInput[];
};

function validId(value: string) { return idPattern.test(value); }
function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}

function refresh() {
  revalidatePath("/roadmap");
  revalidatePath("/planning");
  revalidatePath("/planning/week");
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/intelligence");
  revalidatePath("/");
}

export async function createWeekAction(input: CreateWeekInput): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before planning a week." };
  const { supabase, userId } = access;

  if (!validId(input.roadmapMonthId)) return { ok: false, error: "Choose a valid roadmap month." };
  if (!input.weekStart || !datePattern.test(input.weekStart)) return { ok: false, error: "Choose a valid week start date." };
  if (input.weekEnd && !datePattern.test(input.weekEnd)) return { ok: false, error: "Choose a valid week end date." };
  if (input.weekEnd && input.weekEnd < input.weekStart) return { ok: false, error: "Week end must be on or after week start." };

  const objective = cleanText(input.objective, 500);
  if (!objective.ok) return objective;
  const status = input.status ?? "planned";
  if (!["planned", "active", "completed", "archived"].includes(status)) return { ok: false, error: "Choose a valid week status." };

  // Verify the parent month belongs to the user.
  const { data: month } = await supabase.from("roadmap_months").select("id").eq("id", input.roadmapMonthId).eq("user_id", userId).maybeSingle();
  if (!month) return { ok: false, error: "That roadmap month could not be found." };

  // Duplicate/conflicting week detection: same month, overlapping period.
  const { data: existingWeeks } = await supabase.from("roadmap_weeks").select("id, week_start, week_end").eq("user_id", userId).eq("roadmap_month_id", input.roadmapMonthId);
  const conflict = (existingWeeks ?? []).find((week) => {
    const existingStart = week.week_start;
    const existingEnd = week.week_end ?? week.week_start;
    const newEnd = input.weekEnd ?? input.weekStart;
    return input.weekStart <= existingEnd && newEnd >= existingStart;
  });
  if (conflict) return { ok: false, error: `A week already covers this period (${conflict.week_start}${conflict.week_end ? ` → ${conflict.week_end}` : ""}). Choose that week instead of creating a duplicate.` };

  // Create the week.
  const { data: week, error: weekError } = await supabase.from("roadmap_weeks").insert({ user_id: userId, roadmap_month_id: input.roadmapMonthId, week_start: input.weekStart, week_end: input.weekEnd || null, objective: objective.value, status }).select("id").single();
  if (weekError) return { ok: false, error: "The week could not be created. Please try again." };
  const weekId = week.id;

  // Create tasks.
  for (const task of input.tasks ?? []) {
    const title = task.title?.trim();
    if (!title) continue;
    const track = task.track?.trim() || null;
    if (track && !tracks.includes(track as (typeof tracks)[number])) return { ok: false, error: "Choose a valid task track." };
    const result = await createTaskForCurrentUser({
      title,
      description: task.description,
      track: track ?? undefined,
      priority: task.priority,
      dueOn: task.dueOn || undefined,
      estimatedMinutes: task.estimatedMinutes,
      roadmapWeekId: weekId,
      status: "planned",
    });
    if (!result.ok) return { ok: false, error: result.error };
  }

  // Create milestones.
  for (const milestone of input.milestones ?? []) {
    const title = milestone.title?.trim();
    if (!title) continue;
    const track = milestone.track?.trim() || null;
    const { error: milestoneError } = await supabase.from("milestones").insert({ user_id: userId, title, due_on: milestone.dueOn || null, status: "planned", track });
    if (milestoneError) return { ok: false, error: "The week was created, but a milestone could not be saved." };
  }

  refresh();
  return { ok: true, weekId };
}
