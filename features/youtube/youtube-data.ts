import { getAuthorizedAccess } from "@/lib/auth/server";
import type { VideoStage } from "@/features/youtube/video-stages";

export type YoutubeChannel = {
  id: string;
  channelName: string | null;
  channelUrl: string | null;
  niche: string | null;
  targetAudience: string | null;
  contentFormat: string | null;
  primaryObjective: string | null;
  publishingCadence: string | null;
  status: string;
  notes: string | null;
  contentAngle: string | null;
  valueProposition: string | null;
  productionWorkflow: string | null;
  monetizationPlan: string | null;
  strategicFocus: string | null;
};

export type YoutubeVideo = {
  id: string;
  title: string;
  notes: string | null;
  stage: VideoStage;
  priority: number;
  targetPublishDate: string | null;
  taskId: string | null;
  createdAt: string;
};

export type YoutubeMetric = {
  id: string;
  metricDate: string;
  name: string;
  value: number;
  unit: string | null;
  note: string | null;
};

export type YoutubeMilestone = {
  id: string;
  title: string;
  description: string | null;
  dueOn: string | null;
  achievedOn: string | null;
  status: string;
};

export type YoutubeData = {
  authenticated: boolean;
  error: string | null;
  channel: YoutubeChannel | null;
  videos: YoutubeVideo[];
  metrics: YoutubeMetric[];
  milestones: YoutubeMilestone[];
};

type RawChannel = {
  id: string; channel_name: string | null; channel_url: string | null; niche: string | null;
  target_audience: string | null; content_format: string | null; primary_objective: string | null;
  publishing_cadence: string | null; status: string; notes: string | null; content_angle: string | null;
  value_proposition: string | null; production_workflow: string | null; monetization_plan: string | null; strategic_focus: string | null;
};
type RawVideo = { id: string; title: string; notes: string | null; stage: VideoStage; priority: number; target_publish_date: string | null; task_id: string | null; created_at: string };
type RawMetric = { id: string; metric_date: string; name: string; value: number; unit: string | null; note: string | null };
type RawMilestone = { id: string; title: string; description: string | null; due_on: string | null; achieved_on: string | null; status: string };

function emptyYoutube(error: string | null = null): YoutubeData {
  return { authenticated: false, error, channel: null, videos: [], metrics: [], milestones: [] };
}

export async function getYoutubeData(): Promise<YoutubeData> {
  const access = await getAuthorizedAccess();
  if (!access) return emptyYoutube();
  const { supabase, userId } = access;

  const [channelResult, videosResult, metricsResult, milestonesResult] = await Promise.all([
    supabase.from("youtube_channels").select("id, channel_name, channel_url, niche, target_audience, content_format, primary_objective, publishing_cadence, status, notes, content_angle, value_proposition, production_workflow, monetization_plan, strategic_focus").eq("user_id", userId).maybeSingle(),
    supabase.from("youtube_videos").select("id, title, notes, stage, priority, target_publish_date, task_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("youtube_metrics").select("id, metric_date, name, value, unit, note").eq("user_id", userId).order("metric_date", { ascending: false }).limit(500),
    supabase.from("milestones").select("id, title, description, due_on, achieved_on, status").eq("user_id", userId).eq("track", "youtube").order("created_at", { ascending: false }).limit(200),
  ]);

  const firstError = [channelResult.error, videosResult.error, metricsResult.error, milestonesResult.error].find(Boolean);
  if (firstError) return emptyYoutube("We could not load your YouTube workspace. Please try again.");

  const channel = channelResult.data as RawChannel | null;
  return {
    authenticated: true,
    error: null,
    channel: channel ? {
      id: channel.id,
      channelName: channel.channel_name,
      channelUrl: channel.channel_url,
      niche: channel.niche,
      targetAudience: channel.target_audience,
      contentFormat: channel.content_format,
      primaryObjective: channel.primary_objective,
      publishingCadence: channel.publishing_cadence,
      status: channel.status,
      notes: channel.notes,
      contentAngle: channel.content_angle,
      valueProposition: channel.value_proposition,
      productionWorkflow: channel.production_workflow,
      monetizationPlan: channel.monetization_plan,
      strategicFocus: channel.strategic_focus,
    } : null,
    videos: ((videosResult.data ?? []) as RawVideo[]).map((video) => ({ id: video.id, title: video.title, notes: video.notes, stage: video.stage, priority: video.priority, targetPublishDate: video.target_publish_date, taskId: video.task_id, createdAt: video.created_at })),
    metrics: ((metricsResult.data ?? []) as RawMetric[]).map((metric) => ({ id: metric.id, metricDate: metric.metric_date, name: metric.name, value: metric.value, unit: metric.unit, note: metric.note })),
    milestones: ((milestonesResult.data ?? []) as RawMilestone[]).map((milestone) => ({ id: milestone.id, title: milestone.title, description: milestone.description, dueOn: milestone.due_on, achievedOn: milestone.achieved_on, status: milestone.status })),
  };
}
