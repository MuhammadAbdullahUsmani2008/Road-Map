"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, BarChart3, Brain, Check, CircleAlert, ClipboardList, FileText, Layers3, Map, NotebookPen, Plus, Target, Trash2, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createDecisionNoteAction, deleteDecisionNoteAction } from "@/app/actions/intelligence-actions";
import { EmptyState } from "@/components/feedback/feedback-patterns";
import { ProgressBar, ProgressRing } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { IntelligenceData, IntelligencePeriod } from "@/features/intelligence/intelligence-data";

const periods: Array<{ key: IntelligencePeriod; label: string }> = [
  { key: "current-week", label: "Current week" },
  { key: "previous-week", label: "Previous week" },
  { key: "current-month", label: "Current month" },
  { key: "previous-month", label: "Previous month" },
];

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Not tracked";
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatMetric(value: number, unit: string | null) {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : null;
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p>{hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}</div>;
}

function trackTone(track: string): "primary" | "violet" | "neutral" {
  if (track === "E-Commerce") return "primary";
  if (track === "YouTube Automation") return "violet";
  return "neutral";
}

function NoteModal({ pending, error, onClose, onSubmit }: { pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { observation: string; evidence: string; decision: string; reason: string; followUp: string }) => void }) {
  const [form, setForm] = useState({ observation: "", evidence: "", decision: "", reason: "", followUp: "" });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const field = (label: string, key: keyof typeof form, placeholder: string) => (
    <label className="block text-sm font-semibold">{label}<textarea value={form[key]} onChange={(event) => set(key, event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder={placeholder} maxLength={2000} /></label>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="note-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">Decision note</Badge><h2 id="note-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Preserve your reasoning.</h2></div><IconButton onClick={onClose} aria-label="Close note form"><X size={19} /></IconButton></div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          {field("Observation", "observation", "What did you notice?")}
          {field("Evidence", "evidence", "What data supports this?")}
          {field("Decision", "decision", "What did you decide?")}
          {field("Reason", "reason", "Why this decision?")}
          {field("Follow-up", "followUp", "What should happen next?")}
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save note"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

export function IntelligencePage({ data, period }: { data: IntelligenceData; period: IntelligencePeriod }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Intelligence</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to review your execution.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your execution intelligence is private to your authenticated workspace.</p></div>;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><Brain size={14} />Evidence → decision</p><Badge tone="primary" dot>Intelligence</Badge></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Execution Intelligence.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Surface what actually happened so you can decide what to do next. No predictions, no promises — just evidence.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Private workspace</div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Period selector">
        {periods.map((item) => (
          <Link key={item.key} href={`/intelligence?period=${item.key}`} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${period === item.key ? "bg-[var(--primary)] text-white" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`} aria-current={period === item.key ? "page" : undefined}>{item.label}</Link>
        ))}
      </nav>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      {/* Execution overview */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="overview-heading">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><ClipboardList size={15} />{data.periodLabel}</p><h2 id="overview-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{data.planned > 0 ? `${data.completed} of ${data.planned} tasks complete` : "No tasks planned for this period."}</h2><p className="mt-2 text-sm text-[var(--muted)]">{data.periodStart} → {data.periodEnd}</p></div>
            <ProgressRing value={data.completionPercent} label="complete" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4"><MetricCard label="Planned" value={String(data.planned)} /><MetricCard label="Completed" value={String(data.completed)} /><MetricCard label="Incomplete" value={String(data.incomplete)} /><MetricCard label="Overdue" value={String(data.overdue)} /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><MetricCard label="Focus time" value={formatMinutes(data.focusedMinutes)} /><MetricCard label="Daily minimum" value={data.dailyMinimumComplete ? "Complete" : "Open"} /></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="roadmap-heading">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Map size={15} />Roadmap alignment</p>
          {data.roadmap ? (
            <div className="mt-4">
              <h2 id="roadmap-heading" className="text-xl font-semibold tracking-[-0.03em]">{data.roadmap.goalTitle ?? data.roadmap.yearTitle ?? "Active roadmap"}</h2>
              <div className="mt-4 grid grid-cols-2 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:grid-cols-4"><div className="rounded-lg bg-[var(--primary-tint)] px-2 py-3 text-[var(--primary)]">Year {data.roadmap.year ?? "—"}</div><div className="rounded-lg bg-[var(--violet-tint)] px-2 py-3 text-[var(--violet)]">{data.roadmap.phaseTitle ?? "Phase"}</div><div className="rounded-lg bg-[var(--surface-muted)] px-2 py-3">{data.roadmap.monthTitle ?? "Month"}</div><div className="rounded-lg bg-[var(--success-tint)] px-2 py-3 text-[var(--success)]">{data.roadmap.weekTitle ?? "Week"}</div></div>
              {data.roadmap.weekObjective ? <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">{data.roadmap.weekObjective}</p> : null}
            </div>
          ) : (
            <div className="mt-4"><EmptyState title="No active roadmap context." detail="Activate a goal, year, phase, month, and week to see alignment here." /></div>
          )}
        </div>
      </section>

      {/* Track breakdown */}
      <section className="mt-8" aria-labelledby="tracks-heading">
        <div className="mb-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Layers3 size={15} />Track breakdown</p><h2 id="tracks-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Where attention is going</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {data.tracks.map((track) => (
            <div key={track.track} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{track.track}</h3><Badge tone={trackTone(track.track)}>{track.planned} planned</Badge></div>
              <div className="mt-4"><ProgressBar value={track.completionPercent} label={track.planned > 0 ? `${track.completed}/${track.planned} complete` : "No tasks planned"} tone={track.track === "E-Commerce" ? "primary" : track.track === "YouTube Automation" ? "violet" : "neutral"} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><MetricCard label="Incomplete" value={String(track.incomplete)} /><MetricCard label="Overdue" value={String(track.overdue)} /></div>
              {track.milestones.length > 0 ? (
                <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Milestones</p><ul className="mt-2 space-y-1">{track.milestones.map((milestone) => <li key={milestone.title} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{milestone.title}</span><Badge tone={milestone.status === "achieved" ? "success" : "neutral"}>{milestone.status}</Badge></li>)}</ul></div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Planned vs actual */}
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="pva-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><TrendingUp size={15} />Planned vs actual</p>
        <h2 id="pva-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.periodLabel}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Overall" value={data.planned > 0 ? `${data.completed} / ${data.planned}` : "No data"} hint={data.planned > 0 ? `${data.completionPercent}% complete` : undefined} />
          {data.tracks.map((track) => <MetricCard key={track.track} label={track.track} value={track.planned > 0 ? `${track.completed} / ${track.planned}` : "No data"} hint={track.planned > 0 ? `${track.completionPercent}% complete` : undefined} />)}
        </div>
        {data.planned === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">No tasks were planned for this period, so there is nothing to compare yet.</p> : null}
      </section>

      {/* Business evidence */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Business evidence">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><BarChart3 size={15} />E-Commerce evidence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.businessMetrics.length > 0 ? "Recorded metrics" : "No business metrics yet."}</h2>
          {data.businessMetrics.length > 0 ? <div className="mt-4 space-y-2">{data.businessMetrics.map((metric) => <div key={`${metric.name}-${metric.metricDate}`} className="flex items-center justify-between gap-4 text-sm"><span className="text-[var(--muted)]">{metric.name} · {metric.metricDate}</span><span className="font-semibold">{formatMetric(metric.value, metric.unit)}</span></div>)}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No business metrics recorded for this period.</p>}
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><BarChart3 size={15} />YouTube evidence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.youtubeMetrics.length > 0 ? "Recorded metrics" : "No YouTube metrics yet."}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><MetricCard label="Videos published" value={String(data.youtubePublishedCount)} /><MetricCard label="Metrics recorded" value={String(data.youtubeMetrics.length)} /></div>
          {data.youtubeMetrics.length > 0 ? <div className="mt-4 space-y-2">{data.youtubeMetrics.map((metric) => <div key={`${metric.name}-${metric.metricDate}`} className="flex items-center justify-between gap-4 text-sm"><span className="text-[var(--muted)]">{metric.name} · {metric.metricDate}</span><span className="font-semibold">{formatMetric(metric.value, metric.unit)}</span></div>)}</div> : null}
        </div>
      </section>

      {/* Milestones */}
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="milestones-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]"><Target size={15} />Active milestones</p>
        <h2 id="milestones-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.activeMilestones.length > 0 ? `${data.activeMilestones.length} active` : "No active milestones."}</h2>
        {data.activeMilestones.length > 0 ? (
          <ul className="mt-4 space-y-2">{data.activeMilestones.map((milestone) => <li key={milestone.title} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{milestone.title}</p>{milestone.track ? <p className="text-xs text-[var(--muted)]">{milestone.track}</p> : null}</div><div className="flex shrink-0 items-center gap-3"><span className="text-xs text-[var(--muted)]">{milestone.dueOn ? `Due ${formatDate(milestone.dueOn)}` : "No due date"}</span><Badge tone={milestone.status === "achieved" ? "success" : "neutral"}>{milestone.status}</Badge></div></li>)}</ul>
        ) : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No milestones are currently active.</p>}
      </section>

      {/* Decision notes */}
      <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="notes-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><NotebookPen size={15} />Decision notes</p><h2 id="notes-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">Your reasoning, preserved.</h2></div><Button type="button" onClick={() => setModal(true)}><Plus size={16} />Add note</Button></div>
        {data.decisionNotes.length === 0 ? (
          <div className="mt-4"><EmptyState title="No decision notes yet." detail="Record observations, evidence, decisions, and follow-ups during your reviews." /></div>
        ) : (
          <div className="mt-4 space-y-3">{data.decisionNotes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-[var(--line)] p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-2 text-sm">{note.observation ? <p><span className="font-semibold text-[var(--ink)]">Observation: </span>{note.observation}</p> : null}{note.evidence ? <p><span className="font-semibold text-[var(--ink)]">Evidence: </span>{note.evidence}</p> : null}{note.decision ? <p><span className="font-semibold text-[var(--ink)]">Decision: </span>{note.decision}</p> : null}{note.reason ? <p><span className="font-semibold text-[var(--ink)]">Reason: </span>{note.reason}</p> : null}{note.followUp ? <p><span className="font-semibold text-[var(--ink)]">Follow-up: </span>{note.followUp}</p> : null}</div><IconButton onClick={() => { setError(null); startTransition(async () => { const result = await deleteDecisionNoteAction(note.id); if (!result.ok) { setError(result.error); return; } setSuccess("Note deleted."); router.refresh(); }); }} aria-label="Delete note"><Trash2 size={16} /></IconButton></div>
            </article>
          ))}</div>
        )}
      </section>

      {/* Review connection */}
      <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-8" aria-labelledby="review-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><FileText size={15} />Review connection</p>
        <h2 id="review-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Carry this into your next review.</h2>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/reports/daily" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Daily reports <ArrowRight size={16} /></Link><Link href="/reports/weekly" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Weekly review <ArrowRight size={16} /></Link><Link href="/planning" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Planning <ArrowRight size={16} /></Link><Link href="/roadmap" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Roadmap <ArrowRight size={16} /></Link><Link href="/youtube" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">YouTube <ArrowRight size={16} /></Link></div>
      </section>

      {modal ? <NoteModal pending={pending} error={error} onClose={() => setModal(false)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await createDecisionNoteAction(form); if (!result.ok) { setError(result.error); return; } setModal(false); setSuccess("Decision note saved."); router.refresh(); }); }} /> : null}
    </div>
  );
}
