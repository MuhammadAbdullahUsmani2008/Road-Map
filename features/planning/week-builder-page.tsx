"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, Check, CircleAlert, Layers3, Plus, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createWeekAction, type WeekMilestoneInput, type WeekTaskInput } from "@/app/actions/week-builder-actions";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { WeekBuilderData } from "@/features/planning/week-builder-data";

const TRACKS = ["E-Commerce", "YouTube Automation", "Operating System"] as const;

type TaskDraft = { title: string; description: string; track: string; priority: string; dueOn: string; estimatedMinutes: string };
type MilestoneDraft = { title: string; dueOn: string; track: string };

const blankTask: TaskDraft = { title: "", description: "", track: "E-Commerce", priority: "3", dueOn: "", estimatedMinutes: "" };
const blankMilestone: MilestoneDraft = { title: "", dueOn: "", track: "E-Commerce" };

function inputClass() {
  return "mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]";
}

export function WeekBuilderPage({ data }: { data: WeekBuilderData }) {
  const router = useRouter();
  const [monthId, setMonthId] = useState(data.months[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(data.suggestedWeekStart);
  const [weekEnd, setWeekEnd] = useState(data.suggestedWeekEnd);
  const [objective, setObjective] = useState("");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateTask(index: number, patch: Partial<TaskDraft>) {
    setTasks((current) => current.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  }
  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((current) => current.map((milestone, i) => (i === index ? { ...milestone, ...patch } : milestone)));
  }

  function submit() {
    setError(null); setSuccess(null);
    const taskInputs: WeekTaskInput[] = tasks.filter((task) => task.title.trim()).map((task) => ({
      title: task.title.trim(),
      description: task.description.trim() || undefined,
      track: task.track || undefined,
      priority: Number(task.priority),
      dueOn: task.dueOn || undefined,
      estimatedMinutes: task.estimatedMinutes ? Number(task.estimatedMinutes) : undefined,
    }));
    const milestoneInputs: WeekMilestoneInput[] = milestones.filter((milestone) => milestone.title.trim()).map((milestone) => ({
      title: milestone.title.trim(),
      dueOn: milestone.dueOn || undefined,
      track: milestone.track || undefined,
    }));
    startTransition(async () => {
      const result = await createWeekAction({ roadmapMonthId: monthId, weekStart, weekEnd: weekEnd || undefined, objective: objective || undefined, tasks: taskInputs, milestones: milestoneInputs });
      if (!result.ok) { setError(result.error); return; }
      setSuccess("Week created.");
      router.push("/planning/week");
      router.refresh();
    });
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Week builder</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to plan a week.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your weekly planning is private to your authenticated workspace.</p></div>;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="border-b border-[var(--line)] pb-8">
        <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><CalendarDays size={14} />Weekly planning</p><Badge tone="primary" dot>New week</Badge></div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Plan the next week.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Choose the roadmap context, set the week&apos;s objective, and add the tasks that belong to each track. You stay in control of what gets planned.</p>
      </header>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="context-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Layers3 size={15} />Roadmap context</p>
        <h2 id="context-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Where does this week belong?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Parent month<select className={inputClass()} value={monthId} onChange={(event) => setMonthId(event.target.value)} required>{data.months.length === 0 ? <option value="">No months available</option> : data.months.map((month) => <option key={month.id} value={month.id}>{month.monthStart} · {month.title}{month.year ? ` (Year ${month.year})` : ""}</option>)}</select></label>
          <label className="block text-sm font-semibold">Week objective<textarea className={`${inputClass()} min-h-20 py-3`} value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={500} placeholder="What outcome makes this week count?" /></label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Week starts<input className={inputClass()} type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} required /></label>
          <label className="block text-sm font-semibold">Week ends<input className={inputClass()} type="date" value={weekEnd} onChange={(event) => setWeekEnd(event.target.value)} /></label>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="tasks-heading">
        <div className="mb-4 flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Target size={15} />Tasks</p><h2 id="tasks-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">What needs to happen?</h2></div><Button type="button" variant="secondary" onClick={() => setTasks((current) => [...current, { ...blankTask }])}><Plus size={16} />Add task</Button></div>
        {tasks.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">No tasks yet. Add tasks and assign each to a track.</p> : <div className="space-y-3">{tasks.map((task, index) => (
          <div key={index} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3"><input className={inputClass()} value={task.title} onChange={(event) => updateTask(index, { title: event.target.value })} placeholder="Task title" maxLength={160} /><IconButton onClick={() => setTasks((current) => current.filter((_, i) => i !== index))} aria-label="Remove task"><Trash2 size={16} /></IconButton></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Track<select className={inputClass()} value={task.track} onChange={(event) => updateTask(index, { track: event.target.value })}>{TRACKS.map((track) => <option key={track} value={track}>{track}</option>)}</select></label>
              <label className="block text-sm font-semibold">Priority<select className={inputClass()} value={task.priority} onChange={(event) => updateTask(index, { priority: event.target.value })}><option value="1">High</option><option value="3">Medium</option><option value="5">Low</option></select></label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Due date<input className={inputClass()} type="date" value={task.dueOn} onChange={(event) => updateTask(index, { dueOn: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Estimated minutes<input className={inputClass()} type="number" min="1" max="1440" value={task.estimatedMinutes} onChange={(event) => updateTask(index, { estimatedMinutes: event.target.value })} placeholder="45" /></label>
            </div>
            <label className="mt-3 block text-sm font-semibold">Description<textarea className={`${inputClass()} min-h-16 py-3`} value={task.description} onChange={(event) => updateTask(index, { description: event.target.value })} maxLength={2000} /></label>
          </div>
        ))}</div>}
      </section>

      <section className="mt-8" aria-labelledby="milestones-heading">
        <div className="mb-4 flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Target size={15} />Milestones</p><h2 id="milestones-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Optional milestones</h2></div><Button type="button" variant="secondary" onClick={() => setMilestones((current) => [...current, { ...blankMilestone }])}><Plus size={16} />Add milestone</Button></div>
        {milestones.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">No milestones. Add one if this week has a meaningful marker.</p> : <div className="space-y-3">{milestones.map((milestone, index) => (
          <div key={index} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3"><input className={inputClass()} value={milestone.title} onChange={(event) => updateMilestone(index, { title: event.target.value })} placeholder="Milestone title" maxLength={160} /><IconButton onClick={() => setMilestones((current) => current.filter((_, i) => i !== index))} aria-label="Remove milestone"><Trash2 size={16} /></IconButton></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Due date<input className={inputClass()} type="date" value={milestone.dueOn} onChange={(event) => updateMilestone(index, { dueOn: event.target.value })} /></label>
              <label className="block text-sm font-semibold">Track<select className={inputClass()} value={milestone.track} onChange={(event) => updateMilestone(index, { track: event.target.value })}>{TRACKS.map((track) => <option key={track} value={track}>{track}</option>)}</select></label>
            </div>
          </div>
        ))}</div>}
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <Link href="/planning/week" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Cancel</Link>
        <Button type="button" onClick={submit} disabled={pending || !monthId || !weekStart}>{pending ? "Creating..." : "Create week"}<Check size={16} /></Button>
      </div>
    </div>
  );
}
