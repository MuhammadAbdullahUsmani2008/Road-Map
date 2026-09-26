"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { createTaskForCurrentUser } from "@/lib/tasks/task-operations";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stages = ["idea", "research", "script", "voice", "edit", "thumbnail", "ready", "published"] as const;
const channelStatuses = ["planning", "active", "paused", "archived"] as const;

function validId(value: string) { return idPattern.test(value); }
function cleanText(value: string | undefined, maxLength: number) {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) return { ok: false as const, error: `Keep this under ${maxLength} characters.` };
  return { ok: true as const, value: text };
}
function validDate(value: string | undefined) { return value === undefined || value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value); }

function refresh() {
  revalidatePath("/youtube");
  revalidatePath("/");
}

// ---- Channel / project + strategy (single row per user) ----

export async function saveChannelAction(input: {
  channelName?: string; channelUrl?: string; niche?: string; targetAudience?: string;
  contentFormat?: string; primaryObjective?: string; publishingCadence?: string; status?: string; notes?: string;
  contentAngle?: string; valueProposition?: string; productionWorkflow?: string; monetizationPlan?: string; strategicFocus?: string;
}): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing your channel." };

  const fields: Record<string, string | null> = {};
  const textFields: Array<[string, string | undefined, number]> = [
    ["channel_name", input.channelName, 160],
    ["channel_url", input.channelUrl, 500],
    ["niche", input.niche, 160],
    ["target_audience", input.targetAudience, 500],
    ["content_format", input.contentFormat, 160],
    ["primary_objective", input.primaryObjective, 500],
    ["publishing_cadence", input.publishingCadence, 160],
    ["notes", input.notes, 2000],
    ["content_angle", input.contentAngle, 500],
    ["value_proposition", input.valueProposition, 500],
    ["production_workflow", input.productionWorkflow, 1000],
    ["monetization_plan", input.monetizationPlan, 1000],
    ["strategic_focus", input.strategicFocus, 500],
  ];
  for (const [key, value, max] of textFields) {
    const cleaned = cleanText(value, max);
    if (!cleaned.ok) return cleaned;
    fields[key] = cleaned.value;
  }

  const status = input.status ?? "planning";
  if (!channelStatuses.includes(status as (typeof channelStatuses)[number])) return { ok: false, error: "Choose a valid channel status." };

  const { error } = await access.supabase.from("youtube_channels").upsert({ user_id: access.userId, ...fields, status }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Your channel could not be saved. Please try again." };
  refresh();
  return { ok: true };
}

// ---- Video ideas / content pipeline ----

export async function createVideoAction(input: { title: string; notes?: string; stage?: string; priority?: number; targetPublishDate?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before adding a video." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (title.length > 160) return { ok: false, error: "Titles must be 160 characters or fewer." };
  const notes = cleanText(input.notes, 2000);
  if (!notes.ok) return notes;
  const stage = input.stage ?? "idea";
  if (!stages.includes(stage as (typeof stages)[number])) return { ok: false, error: "Choose a valid stage." };
  const priority = input.priority ?? 3;
  if (![1, 2, 3, 4, 5].includes(priority)) return { ok: false, error: "Choose a valid priority." };
  if (!validDate(input.targetPublishDate)) return { ok: false, error: "Choose a valid publish date." };

  const { data, error } = await access.supabase.from("youtube_videos").insert({ user_id: access.userId, title, notes: notes.value, stage, priority, target_publish_date: input.targetPublishDate || null }).select("id").single();
  if (error) return { ok: false, error: "The video could not be created. Please try again." };
  refresh();
  return { ok: true, id: data.id };
}

export async function updateVideoAction(id: string, input: { title?: string; notes?: string; stage?: string; priority?: number; targetPublishDate?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing a video." };
  if (!validId(id)) return { ok: false, error: "That video could not be identified." };

  const values: Record<string, string | number | null> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "A title is required." };
    if (title.length > 160) return { ok: false, error: "Titles must be 160 characters or fewer." };
    values.title = title;
  }
  if (input.notes !== undefined) {
    const notes = cleanText(input.notes, 2000);
    if (!notes.ok) return notes;
    values.notes = notes.value;
  }
  if (input.stage !== undefined) {
    if (!stages.includes(input.stage as (typeof stages)[number])) return { ok: false, error: "Choose a valid stage." };
    values.stage = input.stage;
  }
  if (input.priority !== undefined) {
    if (![1, 2, 3, 4, 5].includes(input.priority)) return { ok: false, error: "Choose a valid priority." };
    values.priority = input.priority;
  }
  if (input.targetPublishDate !== undefined) {
    if (!validDate(input.targetPublishDate)) return { ok: false, error: "Choose a valid publish date." };
    values.target_publish_date = input.targetPublishDate || null;
  }

  const { error } = await access.supabase.from("youtube_videos").update(values).eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The video could not be updated. Please try again." };
  refresh();
  return { ok: true };
}

export async function deleteVideoAction(id: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting a video." };
  if (!validId(id)) return { ok: false, error: "That video could not be identified." };
  const { error } = await access.supabase.from("youtube_videos").delete().eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The video could not be deleted. Please try again." };
  refresh();
  return { ok: true };
}

// ---- Task integration: turn a video into an actionable task ----

export async function linkVideoTaskAction(videoId: string, taskTitle?: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before linking a task." };
  if (!validId(videoId)) return { ok: false, error: "That video could not be identified." };

  const { data: video } = await access.supabase.from("youtube_videos").select("id, title, task_id").eq("id", videoId).eq("user_id", access.userId).maybeSingle();
  if (!video) return { ok: false, error: "That video could not be found." };
  if (video.task_id) return { ok: false, error: "This video already has a linked task." };

  const title = (taskTitle?.trim() || `Produce: ${video.title}`).slice(0, 160);
  const result = await createTaskForCurrentUser({ title, description: `YouTube video: ${video.title}`, priority: 3 });
  if (!result.ok) return result;

  const { error } = await access.supabase.from("youtube_videos").update({ task_id: result.data?.id }).eq("id", videoId).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The task was created, but the link could not be saved." };
  refresh();
  revalidatePath("/tasks");
  revalidatePath("/today");
  return { ok: true, id: result.data?.id };
}

// ---- Metrics ----

export async function saveMetricAction(input: { metricDate?: string; name: string; value: string; unit?: string; note?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before recording a metric." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "A metric name is required." };
  if (name.length > 80) return { ok: false, error: "Metric names must be 80 characters or fewer." };
  const value = Number(input.value);
  if (!Number.isFinite(value)) return { ok: false, error: "Enter a valid number." };
  const metricDate = input.metricDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) return { ok: false, error: "Choose a valid date." };
  const unit = cleanText(input.unit, 40);
  if (!unit.ok) return unit;
  const note = cleanText(input.note, 500);
  if (!note.ok) return note;

  const { error } = await access.supabase.from("youtube_metrics").upsert({ user_id: access.userId, metric_date: metricDate, name, value, unit: unit.value, note: note.value }, { onConflict: "user_id,metric_date,name" });
  if (error) return { ok: false, error: "The metric could not be saved. Please try again." };
  refresh();
  return { ok: true };
}

export async function deleteMetricAction(id: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting a metric." };
  if (!validId(id)) return { ok: false, error: "That metric could not be identified." };
  const { error } = await access.supabase.from("youtube_metrics").delete().eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The metric could not be deleted. Please try again." };
  refresh();
  return { ok: true };
}

// ---- Milestones (reuses milestones table with track = 'youtube') ----

export async function createMilestoneAction(input: { title: string; description?: string; dueOn?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before adding a milestone." };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "A milestone title is required." };
  if (title.length > 160) return { ok: false, error: "Milestone titles must be 160 characters or fewer." };
  const description = cleanText(input.description, 1000);
  if (!description.ok) return description;
  if (!validDate(input.dueOn)) return { ok: false, error: "Choose a valid due date." };

  const { error } = await access.supabase.from("milestones").insert({ user_id: access.userId, title, description: description.value, due_on: input.dueOn || null, status: "planned", track: "youtube" });
  if (error) return { ok: false, error: "The milestone could not be created. Please try again." };
  refresh();
  return { ok: true };
}

export async function updateMilestoneAction(id: string, input: { title?: string; description?: string; dueOn?: string; status?: string }): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before editing a milestone." };
  if (!validId(id)) return { ok: false, error: "That milestone could not be identified." };

  const values: Record<string, string | null> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "A milestone title is required." };
    if (title.length > 160) return { ok: false, error: "Milestone titles must be 160 characters or fewer." };
    values.title = title;
  }
  if (input.description !== undefined) {
    const description = cleanText(input.description, 1000);
    if (!description.ok) return description;
    values.description = description.value;
  }
  if (input.dueOn !== undefined) {
    if (!validDate(input.dueOn)) return { ok: false, error: "Choose a valid due date." };
    values.due_on = input.dueOn || null;
  }
  if (input.status !== undefined) {
    if (!["planned", "achieved", "missed", "archived"].includes(input.status)) return { ok: false, error: "Choose a valid milestone status." };
    values.status = input.status;
  }

  const { error } = await access.supabase.from("milestones").update(values).eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The milestone could not be updated. Please try again." };
  refresh();
  return { ok: true };
}

export async function deleteMilestoneAction(id: string): Promise<ActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before deleting a milestone." };
  if (!validId(id)) return { ok: false, error: "That milestone could not be identified." };
  const { error } = await access.supabase.from("milestones").delete().eq("id", id).eq("user_id", access.userId);
  if (error) return { ok: false, error: "The milestone could not be deleted. Please try again." };
  refresh();
  return { ok: true };
}
