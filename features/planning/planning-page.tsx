"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, Layers3, Map, Plus, Target, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveMonthObjectiveAction, saveWeekObjectiveAction } from "@/app/actions/planning-actions";
import { EmptyState } from "@/components/feedback/feedback-patterns";
import { ProgressBar } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/dates";
import type { PlanningData, PlanningWeek } from "@/features/planning/planning-data";

export type PlanningView = "month" | "week";

function statusTone(status: string): "neutral" | "primary" | "success" | "violet" {
  if (status === "active") return "primary";
  if (status === "completed") return "success";
  if (status === "archived") return "violet";
  return "neutral";
}

function ObjectiveForm({ kind, initial, pending, error, onClose, onSubmit }: { kind: "month" | "week"; initial: string; pending: boolean; error: string | null; onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="objective-title">
        <div className="flex items-start justify-between gap-4">
          <div><Badge tone="primary">{kind === "month" ? "Monthly objective" : "Weekly objective"}</Badge><h2 id="objective-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{kind === "month" ? "What must this month produce?" : "What outcome makes this week count?"}</h2></div>
          <IconButton onClick={onClose} aria-label="Close objective form"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(value); }}>
          <label className="block text-sm font-semibold">Objective<textarea autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="A clear, measurable outcome." maxLength={500} /></label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save objective"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

export function PlanningPage({ data, view }: { data: PlanningData; view: PlanningView }) {
  const router = useRouter();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: "month" | "week"; id: string; initial: string } | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const targetMonthStart = shiftMonth(data.currentMonthStart, monthOffset);
  const month = data.months.find((item) => item.monthStart === targetMonthStart) ?? null;
  const selectedWeek = month?.weeks.find((week) => week.id === selectedWeekId) ?? month?.weeks.find((week) => week.weekStart === data.currentWeekStart) ?? month?.weeks[0] ?? null;

  function saveObjective(kind: "month" | "week", id: string, value: string) {
    setError(null);
    startTransition(async () => {
      const result = kind === "month" ? await saveMonthObjectiveAction({ monthId: id, objective: value }) : await saveWeekObjectiveAction({ weekId: id, objective: value });
      if (!result.ok) { setError(result.error); return; }
      setModal(null); setSuccess(`${kind === "month" ? "Monthly" : "Weekly"} objective saved.`); router.refresh();
    });
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Planning</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to plan the next move.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your planning view is private to your authenticated workspace.</p></div>;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><CalendarDays size={14} />Plan → execute → review</p><Badge tone="primary" dot>Planning</Badge></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Make the month and week clear.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Connect the roadmap to the tasks you actually execute. Progress is derived from real task data.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Private workspace</div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Planning views">
        <Link href="/planning" className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${view === "month" ? "bg-[var(--primary)] text-white" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`} aria-current={view === "month" ? "page" : undefined}><Target size={16} />Month</Link>
        <Link href="/planning/week" className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${view === "week" ? "bg-[var(--primary)] text-white" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`} aria-current={view === "week" ? "page" : undefined}><Layers3 size={16} />Week</Link>
      </nav>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      {view === "month" ? (
        <MonthView month={month} targetMonthStart={targetMonthStart} monthOffset={monthOffset} setMonthOffset={setMonthOffset} selectedWeek={selectedWeek} onSelectWeek={setSelectedWeekId} onEditMonth={(id, objective) => setModal({ kind: "month", id, initial: objective })} onEditWeek={(id, objective) => setModal({ kind: "week", id, initial: objective })} />
      ) : (
        <WeekView month={month} targetMonthStart={targetMonthStart} monthOffset={monthOffset} setMonthOffset={setMonthOffset} selectedWeek={selectedWeek} onSelectWeek={setSelectedWeekId} onEditWeek={(id, objective) => setModal({ kind: "week", id, initial: objective })} />
      )}

      {modal ? <ObjectiveForm kind={modal.kind} initial={modal.initial} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(value) => saveObjective(modal.kind, modal.id, value)} /> : null}
    </div>
  );
}

function MonthView({ month, targetMonthStart, monthOffset, setMonthOffset, selectedWeek, onSelectWeek, onEditMonth, onEditWeek }: { month: PlanningData["months"][number] | null; targetMonthStart: string; monthOffset: number; setMonthOffset: (value: number) => void; selectedWeek: PlanningWeek | null; onSelectWeek: (id: string) => void; onEditMonth: (id: string, objective: string) => void; onEditWeek: (id: string, objective: string) => void }) {
  return (
    <>
      <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="month-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Target size={15} />Monthly plan</p>
            <h2 id="month-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{monthLabel(targetMonthStart)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Previous month"><ChevronLeft size={18} /></IconButton>
            <Button type="button" variant="secondary" onClick={() => setMonthOffset(0)}>This month</Button>
            <IconButton onClick={() => setMonthOffset(monthOffset + 1)} aria-label="Next month"><ChevronRight size={18} /></IconButton>
          </div>
        </div>

        {month ? (
          <div className="mt-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(month.status)} dot>{month.status}</Badge>{month.year ? <Badge tone="violet">Year {month.year}</Badge> : null}{month.phaseTitle ? <Badge tone="neutral">{month.phaseTitle}</Badge> : null}</div>
                <p className="mt-4 text-lg font-semibold leading-7">{month.objective || "No monthly objective yet."}</p>
                {month.goalTitle ? <p className="mt-2 text-sm text-[var(--muted)]">Goal: {month.goalTitle}</p> : null}
              </div>
              <Button type="button" variant="secondary" onClick={() => onEditMonth(month.id, month.objective ?? "")}><Target size={16} />{month.objective ? "Edit objective" : "Set objective"}</Button>
            </div>
            <div className="mt-6"><ProgressBar value={month.completionPercent} label={month.totalCount > 0 ? `${month.completedCount} of ${month.totalCount} tasks complete` : "No tasks planned for this month"} tone="primary" /></div>
          </div>
        ) : (
          <div className="mt-6"><EmptyState title="No roadmap month for this period." detail="Create a month in the roadmap, then return here to plan its objective and track its weeks." /><div className="mt-5"><Link href="/roadmap" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open roadmap <ArrowRight size={16} /></Link></div></div>
        )}
      </section>

      {month ? (
        <section className="mt-8" aria-labelledby="weeks-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Layers3 size={15} />Weeks</p><h2 id="weeks-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Weekly outcomes</h2></div>
            <Link href="/planning/week" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">Open week view <ArrowRight size={16} /></Link>
          </div>
          {month.weeks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6"><EmptyState title="No weeks planned for this month." detail="Add weeks in the roadmap, then link tasks to them from Tasks." /></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {month.weeks.map((week) => (
                <WeekCard key={week.id} week={week} selected={selectedWeek?.id === week.id} onSelect={() => onSelectWeek(week.id)} onEdit={() => onEditWeek(week.id, week.objective ?? "")} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {selectedWeek ? (
        <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--violet-tint)] p-6 sm:p-8" aria-labelledby="week-detail-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Map size={15} />Week of {selectedWeek.weekStart}</p>
              <h2 id="week-detail-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{selectedWeek.objective || "No weekly objective yet."}</h2>
            </div>
            <Button type="button" variant="secondary" onClick={() => onEditWeek(selectedWeek.id, selectedWeek.objective ?? "")}><Target size={16} />{selectedWeek.objective ? "Edit objective" : "Set objective"}</Button>
          </div>
          <div className="mt-6"><ProgressBar value={selectedWeek.completionPercent} label={selectedWeek.totalCount > 0 ? `${selectedWeek.completedCount} of ${selectedWeek.totalCount} tasks complete` : "No tasks linked to this week"} tone="violet" /></div>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/planning/week" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open week view <ArrowRight size={16} /></Link><Link href="/reports/weekly" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Weekly review <ArrowRight size={16} /></Link></div>
        </section>
      ) : null}
    </>
  );
}

function WeekView({ month, targetMonthStart, monthOffset, setMonthOffset, selectedWeek, onSelectWeek, onEditWeek }: { month: PlanningData["months"][number] | null; targetMonthStart: string; monthOffset: number; setMonthOffset: (value: number) => void; selectedWeek: PlanningWeek | null; onSelectWeek: (id: string) => void; onEditWeek: (id: string, objective: string) => void }) {
  return (
    <>
      <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="week-view-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Layers3 size={15} />Weekly plan</p>
            <h2 id="week-view-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{monthLabel(targetMonthStart)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <IconButton onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Previous month"><ChevronLeft size={18} /></IconButton>
            <Button type="button" variant="secondary" onClick={() => setMonthOffset(0)}>This month</Button>
            <IconButton onClick={() => setMonthOffset(monthOffset + 1)} aria-label="Next month"><ChevronRight size={18} /></IconButton>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3"><Link href="/planning/week/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"><Plus size={16} />Create next week</Link></div>

        {month && month.weeks.length > 0 ? (
          <div className="mt-6">
            <label className="block text-sm font-semibold">Select a week<select value={selectedWeek?.id ?? ""} onChange={(event) => onSelectWeek(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]">{month.weeks.map((week) => <option key={week.id} value={week.id}>{week.weekStart}{week.weekEnd ? ` → ${week.weekEnd}` : ""}{week.objective ? ` · ${week.objective}` : ""}</option>)}</select></label>
          </div>
        ) : (
          <div className="mt-6"><EmptyState title="No weeks planned for this month." detail="Add weeks in the roadmap, then link tasks to them from Tasks." /><div className="mt-5"><Link href="/roadmap" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open roadmap <ArrowRight size={16} /></Link></div></div>
        )}
      </section>

      {selectedWeek ? (
        <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--violet-tint)] p-6 sm:p-8" aria-labelledby="week-detail-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Map size={15} />Week of {selectedWeek.weekStart}</p>
              <h2 id="week-detail-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{selectedWeek.objective || "No weekly objective yet."}</h2>
            </div>
            <Button type="button" variant="secondary" onClick={() => onEditWeek(selectedWeek.id, selectedWeek.objective ?? "")}><Target size={16} />{selectedWeek.objective ? "Edit objective" : "Set objective"}</Button>
          </div>
          <div className="mt-6"><ProgressBar value={selectedWeek.completionPercent} label={selectedWeek.totalCount > 0 ? `${selectedWeek.completedCount} of ${selectedWeek.totalCount} tasks complete` : "No tasks linked to this week"} tone="violet" /></div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Linked tasks</p>
            {selectedWeek.tasks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {selectedWeek.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${task.completed ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--line-strong)] text-transparent"}`} aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
                    <span className={`text-sm ${task.completed ? "text-[var(--muted)] line-through" : "font-medium"}`}>{task.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No tasks linked to this week yet. Link tasks from the Tasks workspace.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3"><Link href="/tasks" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open tasks <ArrowRight size={16} /></Link><Link href="/planning" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Back to month <ArrowRight size={16} /></Link></div>
        </section>
      ) : null}
    </>
  );
}

function WeekCard({ week, selected, onSelect, onEdit }: { week: PlanningWeek; selected: boolean; onSelect: () => void; onEdit: () => void }) {
  return (
    <article className={`rounded-2xl border bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition ${selected ? "border-[var(--primary-soft)] shadow-[var(--shadow-md)]" : "border-[var(--line)]"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{week.objective || `Week of ${week.weekStart}`}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{week.weekStart}{week.weekEnd ? ` → ${week.weekEnd}` : ""}</p>
          </div>
          <Badge tone={statusTone(week.status)} dot>{week.status}</Badge>
        </div>
      </button>
      <div className="mt-4"><ProgressBar value={week.completionPercent} label={week.totalCount > 0 ? `${week.completedCount}/${week.totalCount} tasks` : "No tasks linked"} tone="violet" /></div>
      <div className="mt-4 flex justify-end"><Button type="button" variant="ghost" onClick={onEdit}>Edit objective</Button></div>
    </article>
  );
}
