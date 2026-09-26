"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, BarChart3, Check, CircleAlert, Clapperboard, ListChecks, Megaphone, MonitorPlay, Plus, Trash2, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createMilestoneAction, createVideoAction, deleteMetricAction, deleteMilestoneAction, deleteVideoAction, linkVideoTaskAction, saveChannelAction, saveMetricAction, updateMilestoneAction, updateVideoAction } from "@/app/actions/youtube-actions";
import { EmptyState } from "@/components/feedback/feedback-patterns";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { videoStages, type VideoStage } from "@/features/youtube/video-stages";
import type { YoutubeData, YoutubeVideo } from "@/features/youtube/youtube-data";

export type YoutubeView = "overview" | "channel" | "pipeline" | "metrics" | "milestones";

const stageLabels: Record<VideoStage, string> = {
  idea: "Idea",
  research: "Research",
  script: "Script",
  voice: "Voice",
  edit: "Edit",
  thumbnail: "Thumbnail",
  ready: "Ready",
  published: "Published",
};

const stageEmoji: Record<VideoStage, string> = {
  idea: "💡",
  research: "🔎",
  script: "📝",
  voice: "🎙️",
  edit: "✂️",
  thumbnail: "🖼️",
  ready: "📤",
  published: "✅",
};

function priorityLabel(priority: number) {
  if (priority <= 2) return { label: "High", tone: "danger" as const };
  if (priority === 3) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : null;
}

function formatMetric(value: number, unit: string | null) {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function inputClass() {
  return "mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]";
}

function ModalShell({ badge, title, onClose, children }: { badge: string; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="youtube-modal-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">{badge}</Badge><h2 id="youtube-modal-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{title}</h2></div><IconButton onClick={onClose} aria-label="Close form"><X size={19} /></IconButton></div>
        {children}
      </div>
    </div>
  );
}

export function YoutubePage({ data, view }: { data: YoutubeData; view: YoutubeView }) {
  const router = useRouter();
  const [modal, setModal] = useState<"channel" | "video" | "metric" | "milestone" | null>(null);
  const [editingVideo, setEditingVideo] = useState<YoutubeVideo | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{ id: string; title: string; description: string; dueOn: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish(message: string) {
    setModal(null); setEditingVideo(null); setEditingMilestone(null); setSuccess(message); router.refresh();
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">YouTube</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to build your channel.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your YouTube workspace is private to your authenticated workspace.</p></div>;

  const tabs: Array<{ key: YoutubeView; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: "Overview", icon: <MonitorPlay size={16} /> },
    { key: "channel", label: "Channel", icon: <Megaphone size={16} /> },
    { key: "pipeline", label: "Pipeline", icon: <Clapperboard size={16} /> },
    { key: "metrics", label: "Metrics", icon: <BarChart3 size={16} /> },
    { key: "milestones", label: "Milestones", icon: <Trophy size={16} /> },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><MonitorPlay size={14} />Second business track</p><Badge tone="primary" dot>YouTube</Badge></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">YouTube Automation.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Plan, produce, and measure your channel inside the same execution loop as everything else.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Private workspace</div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="YouTube views">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.key === "overview" ? "/youtube" : `/youtube/${tab.key}`} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${view === tab.key ? "bg-[var(--primary)] text-white" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`} aria-current={view === tab.key ? "page" : undefined}>{tab.icon}{tab.label}</Link>
        ))}
      </nav>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      {view === "overview" ? <OverviewView data={data} onOpen={setModal} /> : null}
      {view === "channel" ? <ChannelView data={data} onEdit={() => setModal("channel")} /> : null}
      {view === "pipeline" ? <PipelineView data={data} onAdd={() => { setEditingVideo(null); setModal("video"); }} onEdit={(video) => { setEditingVideo(video); setModal("video"); }} onDelete={(id) => { setError(null); startTransition(async () => { const result = await deleteVideoAction(id); if (!result.ok) { setError(result.error); return; } finish("Video deleted."); }); }} onLink={(id) => { setError(null); startTransition(async () => { const result = await linkVideoTaskAction(id); if (!result.ok) { setError(result.error); return; } finish("Task created and linked."); }); }} onStageChange={(video, stage) => { setError(null); startTransition(async () => { const result = await updateVideoAction(video.id, { stage }); if (!result.ok) { setError(result.error); return; } setSuccess("Stage updated."); router.refresh(); }); }} /> : null}
      {view === "metrics" ? <MetricsView data={data} onAdd={() => setModal("metric")} onDelete={(id) => { setError(null); startTransition(async () => { const result = await deleteMetricAction(id); if (!result.ok) { setError(result.error); return; } finish("Metric deleted."); }); }} /> : null}
      {view === "milestones" ? <MilestonesView data={data} onAdd={() => { setEditingMilestone(null); setModal("milestone"); }} onEdit={(m) => { setEditingMilestone({ id: m.id, title: m.title, description: m.description ?? "", dueOn: m.dueOn ?? "", status: m.status }); setModal("milestone"); }} onDelete={(id) => { setError(null); startTransition(async () => { const result = await deleteMilestoneAction(id); if (!result.ok) { setError(result.error); return; } finish("Milestone deleted."); }); }} /> : null}

      {modal === "channel" ? <ChannelModal data={data} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await saveChannelAction(form); if (!result.ok) { setError(result.error); return; } finish("Channel saved."); }); }} /> : null}
      {modal === "video" ? <VideoModal video={editingVideo} pending={pending} error={error} onClose={() => { setModal(null); setEditingVideo(null); }} onSubmit={(form) => { setError(null); startTransition(async () => { const result = editingVideo ? await updateVideoAction(editingVideo.id, form) : await createVideoAction(form); if (!result.ok) { setError(result.error); return; } finish(editingVideo ? "Video updated." : "Video added."); }); }} /> : null}
      {modal === "metric" ? <MetricModal pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await saveMetricAction(form); if (!result.ok) { setError(result.error); return; } finish("Metric saved."); }); }} /> : null}
      {modal === "milestone" ? <MilestoneModal milestone={editingMilestone} pending={pending} error={error} onClose={() => { setModal(null); setEditingMilestone(null); }} onSubmit={(form) => { setError(null); startTransition(async () => { const result = editingMilestone ? await updateMilestoneAction(editingMilestone.id, form) : await createMilestoneAction(form); if (!result.ok) { setError(result.error); return; } finish(editingMilestone ? "Milestone updated." : "Milestone created."); }); }} /> : null}
    </div>
  );
}

function OverviewView({ data, onOpen }: { data: YoutubeData; onOpen: (view: "channel" | "video" | "metric" | "milestone") => void }) {
  const inProduction = data.videos.filter((video) => video.stage !== "published" && video.stage !== "idea").length;
  const published = data.videos.filter((video) => video.stage === "published").length;
  const ideas = data.videos.filter((video) => video.stage === "idea").length;

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 lg:grid-cols-3" aria-label="YouTube summary">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Megaphone size={15} />Channel</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.channel?.channelName ?? "No channel added yet."}</h2></div><Badge tone={data.channel ? "success" : "neutral"}>{data.channel ? data.channel.status : "Empty"}</Badge></div>
          {data.channel?.niche ? <p className="mt-2 text-sm text-[var(--muted)]">Niche: {data.channel.niche}</p> : null}
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("channel")}><Megaphone size={16} />{data.channel ? "Edit channel" : "Add channel"}</Button></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Clapperboard size={15} />Pipeline</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{inProduction} in production</h2></div><Badge tone="violet">{data.videos.length} total</Badge></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Ideas</p><p className="mt-2 text-xl font-semibold">{ideas}</p></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Published</p><p className="mt-2 text-xl font-semibold">{published}</p></div></div>
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("video")}><Plus size={16} />Add video</Button></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--success)]"><BarChart3 size={15} />Metrics</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.metrics.length > 0 ? `${data.metrics.length} recorded` : "No metrics yet."}</h2></div><Badge tone={data.metrics.length > 0 ? "success" : "neutral"}>{data.metrics.length > 0 ? "Tracking" : "Empty"}</Badge></div>
          {data.metrics.length > 0 ? <div className="mt-5 space-y-2">{data.metrics.slice(0, 3).map((metric) => <div key={metric.id} className="flex items-center justify-between gap-4 text-sm"><span className="text-[var(--muted)]">{metric.name}</span><span className="font-semibold">{formatMetric(metric.value, metric.unit)}</span></div>)}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Record subscribers, views, and watch time manually.</p>}
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("metric")}><Plus size={16} />Record metric</Button></div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-8" aria-labelledby="yt-loop-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><ListChecks size={15} />Execution loop</p>
        <h2 id="yt-loop-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">YouTube work flows into the same system.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">Turn a video into a task, plan it into a week, execute it today, and review it in Reports.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/tasks" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open tasks <ArrowRight size={16} /></Link><Link href="/planning" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open planning <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  );
}

function ChannelView({ data, onEdit }: { data: YoutubeData; onEdit: () => void }) {
  const channel = data.channel;
  return (
    <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="channel-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Megaphone size={15} />Channel & strategy</p><h2 id="channel-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{channel?.channelName ?? "No channel added yet."}</h2></div>
        <Button type="button" variant="secondary" onClick={onEdit}><Megaphone size={16} />{channel ? "Edit channel" : "Add channel"}</Button>
      </div>
      {channel ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Channel URL" value={channel.channelUrl} />
          <InfoItem label="Niche" value={channel.niche} />
          <InfoItem label="Target audience" value={channel.targetAudience} />
          <InfoItem label="Content format" value={channel.contentFormat} />
          <InfoItem label="Publishing cadence" value={channel.publishingCadence} />
          <InfoItem label="Status" value={channel.status} />
          <InfoItem label="Primary objective" value={channel.primaryObjective} />
          <InfoItem label="Content angle" value={channel.contentAngle} />
          <InfoItem label="Value proposition" value={channel.valueProposition} />
          <InfoItem label="Strategic focus" value={channel.strategicFocus} />
          <InfoItem label="Production workflow" value={channel.productionWorkflow} />
          <InfoItem label="Monetization plan" value={channel.monetizationPlan} />
        </div>
      ) : (
        <div className="mt-6"><EmptyState title="No channel added yet." detail="Record your channel name, niche, and strategy to give this track a direction." /></div>
      )}
      {channel?.notes ? <div className="mt-6 rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Notes</p><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{channel.notes}</p></div> : null}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-sm font-medium">{value || "—"}</p></div>;
}

function PipelineView({ data, onAdd, onEdit, onDelete, onLink, onStageChange }: { data: YoutubeData; onAdd: () => void; onEdit: (video: YoutubeVideo) => void; onDelete: (id: string) => void; onLink: (id: string) => void; onStageChange: (video: YoutubeVideo, stage: VideoStage) => void }) {
  return (
    <section className="mt-8" aria-labelledby="pipeline-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Clapperboard size={15} />Content pipeline</p><h2 id="pipeline-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Videos & ideas</h2></div>
        <Button type="button" onClick={onAdd}><Plus size={16} />Add video</Button>
      </div>
      {data.videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6"><EmptyState title="No video ideas yet." detail="Add your first idea, then move it through the pipeline as it progresses." /></div>
      ) : (
        <div className="space-y-3">
          {data.videos.map((video) => {
            const priority = priorityLabel(video.priority);
            return (
              <article key={video.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{video.title}</h3><Badge tone={priority.tone}>{priority.label}</Badge></div>
                    {video.notes ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{video.notes}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">{video.targetPublishDate ? <span>Target {formatDate(video.targetPublishDate)}</span> : null}{video.taskId ? <Badge tone="success" dot>Task linked</Badge> : null}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <label className="sr-only" htmlFor={`stage-${video.id}`}>Stage</label>
                    <select id={`stage-${video.id}`} value={video.stage} onChange={(event) => onStageChange(video, event.target.value as VideoStage)} className="min-h-10 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-medium outline-none focus:border-[var(--primary)]">
                      {videoStages.map((stage) => <option key={stage} value={stage}>{stageEmoji[stage]} {stageLabels[stage]}</option>)}
                    </select>
                    <Button type="button" variant="ghost" onClick={() => onEdit(video)}>Edit</Button>
                    {!video.taskId ? <Button type="button" variant="secondary" onClick={() => onLink(video.id)}><ListChecks size={15} />Link task</Button> : null}
                    <IconButton onClick={() => onDelete(video.id)} aria-label={`Delete ${video.title}`}><Trash2 size={16} /></IconButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetricsView({ data, onAdd, onDelete }: { data: YoutubeData; onAdd: () => void; onDelete: (id: string) => void }) {
  return (
    <section className="mt-8" aria-labelledby="metrics-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--success)]"><BarChart3 size={15} />Metrics</p><h2 id="metrics-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Manual tracking</h2></div>
        <Button type="button" onClick={onAdd}><Plus size={16} />Record metric</Button>
      </div>
      {data.metrics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6"><EmptyState title="No metrics recorded yet." detail="Record subscribers, views, watch time, and other signals manually as they become available." /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="divide-y divide-[var(--line)]">
            {data.metrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0"><p className="text-sm font-semibold">{metric.name}</p><p className="text-xs text-[var(--muted)]">{metric.metricDate}{metric.note ? ` · ${metric.note}` : ""}</p></div>
                <div className="flex items-center gap-3"><span className="font-semibold">{formatMetric(metric.value, metric.unit)}</span><IconButton onClick={() => onDelete(metric.id)} aria-label={`Delete ${metric.name}`}><Trash2 size={16} /></IconButton></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MilestonesView({ data, onAdd, onEdit, onDelete }: { data: YoutubeData; onAdd: () => void; onEdit: (m: YoutubeData["milestones"][number]) => void; onDelete: (id: string) => void }) {
  return (
    <section className="mt-8" aria-labelledby="milestones-heading">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]"><Trophy size={15} />Milestones</p><h2 id="milestones-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Channel milestones</h2></div>
        <Button type="button" onClick={onAdd}><Plus size={16} />Add milestone</Button>
      </div>
      {data.milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6"><EmptyState title="No milestones yet." detail="Add markers like first video published or first 100 subscribers." /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.milestones.map((milestone) => (
            <article key={milestone.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold">{milestone.title}</h3>{milestone.description ? <p className="mt-1 text-sm text-[var(--muted)]">{milestone.description}</p> : null}</div>
                <Badge tone={milestone.status === "achieved" ? "success" : milestone.status === "missed" ? "danger" : "neutral"} dot>{milestone.status}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted)]">{milestone.dueOn ? `Due ${formatDate(milestone.dueOn)}` : "No due date"}</span>
                <div className="flex gap-1"><Button type="button" variant="ghost" onClick={() => onEdit(milestone)}>Edit</Button><IconButton onClick={() => onDelete(milestone.id)} aria-label={`Delete ${milestone.title}`}><Trash2 size={16} /></IconButton></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelModal({ data, pending, error, onClose, onSubmit }: { data: YoutubeData; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: Record<string, string>) => void }) {
  const channel = data.channel;
  const [form, setForm] = useState({
    channelName: channel?.channelName ?? "",
    channelUrl: channel?.channelUrl ?? "",
    niche: channel?.niche ?? "",
    targetAudience: channel?.targetAudience ?? "",
    contentFormat: channel?.contentFormat ?? "",
    primaryObjective: channel?.primaryObjective ?? "",
    publishingCadence: channel?.publishingCadence ?? "",
    status: channel?.status ?? "planning",
    notes: channel?.notes ?? "",
    contentAngle: channel?.contentAngle ?? "",
    valueProposition: channel?.valueProposition ?? "",
    productionWorkflow: channel?.productionWorkflow ?? "",
    monetizationPlan: channel?.monetizationPlan ?? "",
    strategicFocus: channel?.strategicFocus ?? "",
  });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <ModalShell badge="Channel" title="Record your channel and strategy." onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Channel name<input className={inputClass()} value={form.channelName} onChange={(event) => set("channelName", event.target.value)} maxLength={160} placeholder="My channel" /></label>
          <label className="block text-sm font-semibold">Channel URL<input className={inputClass()} value={form.channelUrl} onChange={(event) => set("channelUrl", event.target.value)} maxLength={500} placeholder="https://youtube.com/@..." /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Niche<input className={inputClass()} value={form.niche} onChange={(event) => set("niche", event.target.value)} maxLength={160} /></label>
          <label className="block text-sm font-semibold">Content format<input className={inputClass()} value={form.contentFormat} onChange={(event) => set("contentFormat", event.target.value)} maxLength={160} placeholder="Faceless, talking head, etc." /></label>
        </div>
        <label className="block text-sm font-semibold">Target audience<textarea className={`${inputClass()} min-h-20 py-3`} value={form.targetAudience} onChange={(event) => set("targetAudience", event.target.value)} maxLength={500} /></label>
        <label className="block text-sm font-semibold">Primary objective<textarea className={`${inputClass()} min-h-20 py-3`} value={form.primaryObjective} onChange={(event) => set("primaryObjective", event.target.value)} maxLength={500} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Publishing cadence<input className={inputClass()} value={form.publishingCadence} onChange={(event) => set("publishingCadence", event.target.value)} maxLength={160} placeholder="2 videos / week" /></label>
          <label className="block text-sm font-semibold">Status<select className={inputClass()} value={form.status} onChange={(event) => set("status", event.target.value)}><option value="planning">Planning</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label>
        </div>
        <label className="block text-sm font-semibold">Content angle<textarea className={`${inputClass()} min-h-20 py-3`} value={form.contentAngle} onChange={(event) => set("contentAngle", event.target.value)} maxLength={500} /></label>
        <label className="block text-sm font-semibold">Value proposition<textarea className={`${inputClass()} min-h-20 py-3`} value={form.valueProposition} onChange={(event) => set("valueProposition", event.target.value)} maxLength={500} /></label>
        <label className="block text-sm font-semibold">Strategic focus<textarea className={`${inputClass()} min-h-20 py-3`} value={form.strategicFocus} onChange={(event) => set("strategicFocus", event.target.value)} maxLength={500} /></label>
        <label className="block text-sm font-semibold">Production workflow<textarea className={`${inputClass()} min-h-20 py-3`} value={form.productionWorkflow} onChange={(event) => set("productionWorkflow", event.target.value)} maxLength={1000} /></label>
        <label className="block text-sm font-semibold">Monetization plan<textarea className={`${inputClass()} min-h-20 py-3`} value={form.monetizationPlan} onChange={(event) => set("monetizationPlan", event.target.value)} maxLength={1000} /></label>
        <label className="block text-sm font-semibold">Notes<textarea className={`${inputClass()} min-h-20 py-3`} value={form.notes} onChange={(event) => set("notes", event.target.value)} maxLength={2000} /></label>
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save channel"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}

function VideoModal({ video, pending, error, onClose, onSubmit }: { video: YoutubeVideo | null; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { title: string; notes: string; stage: string; priority: number; targetPublishDate: string }) => void }) {
  const [form, setForm] = useState({
    title: video?.title ?? "",
    notes: video?.notes ?? "",
    stage: (video?.stage ?? "idea") as VideoStage,
    priority: String(video?.priority ?? 3),
    targetPublishDate: video?.targetPublishDate ?? "",
  });
  return (
    <ModalShell badge={video ? "Edit video" : "New video"} title={video ? "Refine this content item." : "Add a video idea."} onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit({ title: form.title, notes: form.notes, stage: form.stage, priority: Number(form.priority), targetPublishDate: form.targetPublishDate }); }}>
        <label className="block text-sm font-semibold">Title<span className="ml-1 text-[var(--danger)]">*</span><input autoFocus className={inputClass()} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={160} required placeholder="Create first 10-minute video" /></label>
        <label className="block text-sm font-semibold">Notes<textarea className={`${inputClass()} min-h-20 py-3`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={2000} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Stage<select className={inputClass()} value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as VideoStage })}>{videoStages.map((stage) => <option key={stage} value={stage}>{stageEmoji[stage]} {stageLabels[stage]}</option>)}</select></label>
          <label className="block text-sm font-semibold">Priority<select className={inputClass()} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="1">High</option><option value="3">Medium</option><option value="5">Low</option></select></label>
        </div>
        <label className="block text-sm font-semibold">Target publish date<input className={inputClass()} type="date" value={form.targetPublishDate} onChange={(event) => setForm({ ...form, targetPublishDate: event.target.value })} /></label>
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : video ? "Save changes" : "Add video"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}

function MetricModal({ pending, error, onClose, onSubmit }: { pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { metricDate: string; name: string; value: string; unit: string; note: string }) => void }) {
  const [form, setForm] = useState({ metricDate: new Date().toISOString().slice(0, 10), name: "", value: "", unit: "", note: "" });
  return (
    <ModalShell badge="Metric" title="Record a metric." onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Name<span className="ml-1 text-[var(--danger)]">*</span><input autoFocus className={inputClass()} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} required placeholder="Subscribers" /></label>
          <label className="block text-sm font-semibold">Value<span className="ml-1 text-[var(--danger)]">*</span><input className={inputClass()} type="number" step="any" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required placeholder="1000" /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Date<input className={inputClass()} type="date" value={form.metricDate} onChange={(event) => setForm({ ...form, metricDate: event.target.value })} /></label>
          <label className="block text-sm font-semibold">Unit<input className={inputClass()} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} maxLength={40} placeholder="views, hours, $" /></label>
        </div>
        <label className="block text-sm font-semibold">Note<textarea className={`${inputClass()} min-h-20 py-3`} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength={500} /></label>
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save metric"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}

function MilestoneModal({ milestone, pending, error, onClose, onSubmit }: { milestone: { id: string; title: string; description: string; dueOn: string; status: string } | null; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { title: string; description: string; dueOn: string; status: string }) => void }) {
  const [form, setForm] = useState({ title: milestone?.title ?? "", description: milestone?.description ?? "", dueOn: milestone?.dueOn ?? "", status: milestone?.status ?? "planned" });
  return (
    <ModalShell badge={milestone ? "Edit milestone" : "New milestone"} title={milestone ? "Refine this milestone." : "Add a channel milestone."} onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <label className="block text-sm font-semibold">Title<span className="ml-1 text-[var(--danger)]">*</span><input autoFocus className={inputClass()} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={160} required placeholder="First 100 subscribers" /></label>
        <label className="block text-sm font-semibold">Description<textarea className={`${inputClass()} min-h-20 py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1000} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Due date<input className={inputClass()} type="date" value={form.dueOn} onChange={(event) => setForm({ ...form, dueOn: event.target.value })} /></label>
          <label className="block text-sm font-semibold">Status<select className={inputClass()} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="planned">Planned</option><option value="achieved">Achieved</option><option value="missed">Missed</option><option value="archived">Archived</option></select></label>
        </div>
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : milestone ? "Save changes" : "Add milestone"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}
