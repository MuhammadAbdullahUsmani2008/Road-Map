"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, Clock3, FileText, Flame, Map, Plus, RefreshCcw, Target, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTaskAction, createTaskAction, reopenTaskAction } from "@/app/actions/task-actions";
import { saveDailyReportAction, saveWeeklyReviewAction } from "@/app/actions/today-actions";
import { AchievementFeedback, EmptyState } from "@/components/feedback/feedback-patterns";
import { CompletionIndicator, ProgressBar, ProgressRing, StreakIndicator } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { TodayData, TodayTask } from "@/features/today/today-data";

type FormState = { title: string; description: string; priority: string; dueOn: string; estimatedMinutes: string; roadmapWeekId: string };
const blankForm: FormState = { title: "", description: "", priority: "3", dueOn: "", estimatedMinutes: "", roadmapWeekId: "" };

function priorityLabel(priority: number) {
  if (priority <= 2) return { label: "High", tone: "danger" as const };
  if (priority === 3) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const dailyStateCopy = {
  NOT_STARTED: { label: "Not started", tone: "neutral" as const, message: "Today is still available. Start with one task." },
  IN_PROGRESS: { label: "In progress", tone: "primary" as const, message: "You're moving. Keep the next action clear." },
  MINIMUM_ACHIEVED: { label: "Minimum achieved", tone: "success" as const, message: "You protected the floor. Keep going if the work is clear." },
  DAY_COMPLETED: { label: "Day completed", tone: "success" as const, message: "Execution logged and reported. Well done." },
};

function QuickAddForm({ roadmapWeeks, pending, error, onClose, onSubmit }: { roadmapWeeks: TodayData["roadmapWeeks"]; pending: boolean; error: string | null; onSubmit: (form: FormState) => void; onClose: () => void }) {
  const [form, setForm] = useState(blankForm);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">Quick add</Badge><h2 id="quick-add-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Turn intent into an action.</h2></div><IconButton onClick={onClose} aria-label="Close quick add"><X size={19} /></IconButton></div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">Title<span className="ml-1 text-[var(--danger)]">*</span><input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="Create 3 product creatives" required maxLength={160} /></label>
          <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="What does done look like?" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"><option value="1">High</option><option value="3">Medium</option><option value="5">Low</option></select></label><label className="block text-sm font-semibold">Estimated minutes<input type="number" min="1" max="1440" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]" placeholder="45" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Due date<input type="date" value={form.dueOn} onChange={(event) => setForm({ ...form, dueOn: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]" /></label><label className="block text-sm font-semibold">Roadmap week<select value={form.roadmapWeekId} onChange={(event) => setForm({ ...form, roadmapWeekId: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"><option value="">No roadmap link</option>{roadmapWeeks.map((week) => <option key={week.id} value={week.id}>{week.label}</option>)}</select></label></div>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create task"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

function ReportForm({ report, pending, error, onClose, onSubmit }: { report: TodayData["report"]; pending: boolean; error: string | null; onSubmit: (form: { wins: string; blockers: string; energy: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ wins: report?.wins ?? "", blockers: report?.blockers ?? "", energy: report?.energy ? String(report.energy) : "" });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">{report ? "Edit report" : "Daily report"}</Badge><h2 id="report-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{report ? "Refine today's record." : "Log today's execution."}</h2></div><IconButton onClick={onClose} aria-label="Close report form"><X size={19} /></IconButton></div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">What went well<textarea value={form.wins} onChange={(event) => setForm({ ...form, wins: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="The work you actually completed today." maxLength={2000} /></label>
          <label className="block text-sm font-semibold">Blockers / what didn&apos;t happen<textarea value={form.blockers} onChange={(event) => setForm({ ...form, blockers: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="What got in the way, or what you deferred." maxLength={2000} /></label>
          <label className="block text-sm font-semibold">Energy (1–10)<input type="number" min="1" max="10" value={form.energy} onChange={(event) => setForm({ ...form, energy: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="7" /></label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : report ? "Save changes" : "Submit report"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

function ReviewForm({ review, pending, error, onClose, onSubmit }: { review: TodayData["weeklyReview"]; pending: boolean; error: string | null; onSubmit: (form: { summary: string; lessons: string; nextFocus: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ summary: review?.summary ?? "", lessons: review?.lessons ?? "", nextFocus: review?.nextFocus ?? "" });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="violet">{review ? "Edit review" : "Weekly review"}</Badge><h2 id="review-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{review ? "Refine this week's record." : "Close out the week."}</h2></div><IconButton onClick={onClose} aria-label="Close review form"><X size={19} /></IconButton></div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">Summary<textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="What this week actually produced." maxLength={2000} /></label>
          <label className="block text-sm font-semibold">Lessons<textarea value={form.lessons} onChange={(event) => setForm({ ...form, lessons: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="What you learned that changes next week." maxLength={2000} /></label>
          <label className="block text-sm font-semibold">Next focus<textarea value={form.nextFocus} onChange={(event) => setForm({ ...form, nextFocus: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="The one thing to carry into next week." maxLength={2000} /></label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : review ? "Save changes" : "Submit review"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

export function TodayPage({ data }: { data: TodayData }) {
  const router = useRouter();
  const [modal, setModal] = useState<"add" | "report" | "review" | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [localTasks, setLocalTasks] = useState(data.tasks);

  const copy = dailyStateCopy[data.dailyState];
  const completedCount = localTasks.filter((task) => task.completedToday).length;
  const totalCount = localTasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const completedMinutes = localTasks.filter((task) => task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const remainingMinutes = localTasks.filter((task) => !task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  function toggleTask(task: TodayTask) {
    const complete = !task.completedToday;
    setError(null);
    setLocalTasks((current) => current.map((item) => item.id === task.id ? { ...item, completedToday: complete, status: complete ? "completed" : "planned" } : item));
    startTransition(async () => {
      const result = complete ? await completeTaskAction(task.id) : await reopenTaskAction(task.id);
      if (!result.ok) { setLocalTasks((current) => current.map((item) => item.id === task.id ? task : item)); setError(result.error); }
      else { setSuccess(complete ? "Task completed." : "Task reopened."); router.refresh(); }
    });
  }

  function saveTask(form: FormState) {
    setError(null);
    const input = { title: form.title, description: form.description, priority: Number(form.priority), dueOn: form.dueOn || undefined, estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined, roadmapWeekId: form.roadmapWeekId || undefined };
    startTransition(async () => {
      const result = await createTaskAction(input);
      if (!result.ok) { setError(result.error); return; }
      setModal(null); setSuccess("Task created."); router.refresh();
    });
  }

  function saveReport(form: { wins: string; blockers: string; energy: string }) {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyReportAction(form);
      if (!result.ok) { setError(result.error); return; }
      setModal(null); setSuccess("Daily report saved."); router.refresh();
    });
  }

  function saveReview(form: { summary: string; lessons: string; nextFocus: string }) {
    setError(null);
    startTransition(async () => {
      const result = await saveWeeklyReviewAction(form);
      if (!result.ok) { setError(result.error); return; }
      setModal(null); setSuccess("Weekly review saved."); router.refresh();
    });
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Today</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to see what to do today.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your daily execution view is private to your authenticated workspace.</p></div>;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><CalendarClock size={14} />{data.dayOfWeek}, {data.displayDate}</p><Badge tone={copy.tone} dot>{copy.label}</Badge></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Today</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">{copy.message}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Private workspace</div>
      </header>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      {data.missedYesterday && data.currentStreak === 0 ? (
        <section className="mt-6 rounded-3xl border border-[var(--warning-soft)] bg-[var(--warning-tint)] p-6 sm:p-8" aria-labelledby="recovery-heading">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]"><Flame size={15} />Recovery mode</p><h2 id="recovery-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">You missed yesterday. Don&apos;t restart the whole plan.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">Today&apos;s minimum: one important task, 15–30 minutes of focused work, and today&apos;s report. Pick a high-priority task below and start.</p></div>
            <div className="flex flex-wrap gap-3"><Link href={data.tasks[0] ? `/focus?task=${data.tasks[0].id}` : "/tasks"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"><Zap size={16} />Start recovery</Link><Button type="button" variant="secondary" onClick={() => setModal("report")}><FileText size={16} />Write today&apos;s report</Button></div>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-labelledby="progress-heading">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Target size={15} />Daily progress</div><h2 id="progress-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{completedCount} of {totalCount} tasks complete</h2><p className="mt-2 text-sm text-[var(--muted)]">Daily minimum: {data.dailyMinimumTasks} meaningful completed task{data.dailyMinimumTasks === 1 ? "" : "s"}.</p></div>
            <ProgressRing value={percent} label="today" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Completed time</p><p className="mt-2 text-xl font-semibold">{formatMinutes(completedMinutes)}</p></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Remaining time</p><p className="mt-2 text-xl font-semibold">{formatMinutes(remainingMinutes)}</p></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Focused today</p><p className="mt-2 text-xl font-semibold">{data.focusedMinutesToday !== null ? formatMinutes(data.focusedMinutesToday) : "Not tracked"}</p></div></div>
          <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={() => setModal("add")}><Plus size={16} />Quick add task</Button><Button type="button" variant="secondary" onClick={() => setModal("report")}><FileText size={16} />{data.report ? "Edit report" : "Write report"}</Button></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]">🔥 Streak</p>{data.currentStreak > 0 ? <div className="mt-6"><StreakIndicator days={data.currentStreak} /><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[var(--muted)]">Longest</p><p className="mt-1 font-semibold">{data.longestStreak} days</p></div><div><p className="text-xs text-[var(--muted)]">Productive days</p><p className="mt-1 font-semibold">{data.productiveDays}</p></div></div></div> : <div className="mt-6"><EmptyState title="Your streak starts today." detail="Complete one meaningful task to create the first signal." /></div>}</div>
      </section>

      {data.roadmap ? (
        <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--violet-tint)] p-6 sm:p-8" aria-labelledby="week-context-heading">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Map size={15} />Current week</p><h2 id="week-context-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{data.week?.objective ?? data.roadmap.weekTitle ?? "Current week context"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">{data.roadmap.objective || "The current direction is set. Keep the next phase visible."}</p></div>
            <div className="grid grid-cols-2 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:grid-cols-4"><div className="rounded-lg bg-[var(--primary-tint)] px-2 py-3 text-[var(--primary)]">Year {data.roadmap.year}</div><div className="rounded-lg bg-[var(--violet-tint)] px-2 py-3 text-[var(--violet)]">{data.roadmap.phaseTitle ?? "Phase"}</div><div className="rounded-lg bg-[var(--surface)] px-2 py-3">{data.roadmap.monthTitle ?? "Month"}</div><div className="rounded-lg bg-[var(--success-tint)] px-2 py-3 text-[var(--success)]">{data.roadmap.weekTitle ?? "Week"}</div></div>
          </div>
          {data.week ? <div className="mt-6"><ProgressBar value={data.week.completionPercent} label={`${data.week.completedCount} of ${data.week.totalCount} weekly tasks complete`} tone="violet" /></div> : null}
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8" aria-labelledby="no-roadmap-heading"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Roadmap context</p><h2 id="no-roadmap-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">No active roadmap context yet.</h2><p className="mt-2 text-sm text-[var(--muted)]">Connect your goal to a current week to see the full chain here.</p></div><Link href="/roadmap" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open roadmap <ArrowRight size={16} /></Link></div></section>
      )}

      <section className="mt-8" aria-labelledby="priorities-heading">
        <div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Today&apos;s priorities</p><h2 id="priorities-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{totalCount > 0 ? `${totalCount} action${totalCount === 1 ? "" : "s"}` : "Nothing scheduled for today."}</h2></div><Link href="/tasks" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">View all tasks <ArrowRight size={16} /></Link></div>
        {totalCount > 0 ? <div className="space-y-3">{localTasks.map((task) => { const complete = task.completedToday; const priority = priorityLabel(task.priority); const overdue = Boolean(task.dueOn && task.dueOn < data.today && !complete); return <article key={task.id} className={`flex flex-col gap-4 rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] sm:flex-row sm:items-center ${overdue ? "border-[var(--danger-soft)]" : "border-[var(--line)]"}`}><button type="button" onClick={() => toggleTask(task)} disabled={pending} aria-label={complete ? `Reopen ${task.title}` : `Complete ${task.title}`} className="self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-center"><CompletionIndicator complete={complete} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${complete ? "text-[var(--muted)] line-through" : ""}`}>{task.title}</h3><Badge tone={priority.tone}>{priority.label}</Badge>{task.status === "in_progress" ? <Badge tone="primary">In progress</Badge> : null}</div>{task.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{task.description}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">{task.dueOn ? <span className={`inline-flex items-center gap-1 ${overdue ? "text-[var(--danger)]" : ""}`}><CalendarClock size={13} />{overdue ? "Overdue" : `Due ${task.dueOn}`}</span> : null}{task.estimatedMinutes ? <span className="inline-flex items-center gap-1"><Clock3 size={13} />{formatMinutes(task.estimatedMinutes)}</span> : null}</div></div><div className="flex flex-wrap items-center gap-2 sm:shrink-0"><Link href={`/focus?task=${task.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"><Zap size={15} />Focus</Link><Link href={`/tasks?task=${task.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"><RefreshCcw size={15} />Details</Link></div></article>; })}</div> : <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center"><p className="text-sm font-semibold">No tasks scheduled for today.</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">Give the day one clear target. Your first task is enough to create momentum.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Button type="button" onClick={() => setModal("add")}><Plus size={16} />Add a task</Button><Link href="/tasks" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">View tasks <ArrowRight size={16} /></Link></div></div>}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Accountability">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Daily report</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.report ? "Today&apos;s report submitted." : "No report submitted yet."}</h2></div><Badge tone={data.report ? "success" : "neutral"}>{data.report ? "Submitted" : "Open"}</Badge></div>{data.report ? <div className="mt-4 space-y-3 text-sm">{data.report.wins ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Wins: </span>{data.report.wins}</p> : null}{data.report.blockers ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Blockers: </span>{data.report.blockers}</p> : null}{data.report.energy ? <p className="text-[var(--muted)]">Energy: {data.report.energy}/10</p> : null}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Log what you accomplished and what got in the way.</p>}<div className="mt-5"><Button type="button" variant="secondary" onClick={() => setModal("report")}><FileText size={16} />{data.report ? "Edit report" : "Write today's report"}</Button></div></div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">This week</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.week ? `${data.week.completedCount} of ${data.week.totalCount} tasks complete` : "No weekly context yet."}</h2></div><Badge tone={data.weeklyReview ? "success" : "neutral"}>{data.weeklyReview ? "Reviewed" : "Not reviewed"}</Badge></div>{data.week ? <div className="mt-4"><ProgressBar value={data.week.completionPercent} label={`${data.week.completionPercent}% execution`} tone="success" /></div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Link tasks to a roadmap week to see weekly execution here.</p>}<div className="mt-5"><Button type="button" variant="secondary" onClick={() => setModal("review")}><FileText size={16} />{data.weeklyReview ? "Edit weekly review" : "Complete weekly review"}</Button></div></div>
      </section>

      {data.dailyMinimumComplete ? <div className="mt-6"><AchievementFeedback title="Daily minimum complete" detail="You protected the floor. Keep going if the work is clear." /></div> : null}

      {modal === "add" ? <QuickAddForm roadmapWeeks={data.roadmapWeeks} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={saveTask} /> : null}
      {modal === "report" ? <ReportForm report={data.report} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={saveReport} /> : null}
      {modal === "review" ? <ReviewForm review={data.weeklyReview} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={saveReview} /> : null}
    </div>
  );
}
