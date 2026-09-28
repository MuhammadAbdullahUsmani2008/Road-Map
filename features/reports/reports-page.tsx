"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, CircleAlert, ClipboardList, FileText, Flame, NotebookPen, Target, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveDailyReportAction, saveMonthlyReviewAction, saveWeeklyReviewAction } from "@/app/actions/planning-actions";
import { ProgressBar, ProgressRing } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { monthLabel } from "@/lib/dates";
import type { ReportsData } from "@/features/reports/reports-data";

export type ReportsView = "overview" | "daily" | "weekly" | "monthly";

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Not tracked";
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p>{hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}</div>;
}

function TextAreaField({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; maxLength: number }) {
  return <label className="block text-sm font-semibold">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder={placeholder} maxLength={maxLength} /></label>;
}

function ModalShell({ badge, title, onClose, children }: { badge: string; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">{badge}</Badge><h2 id="report-modal-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{title}</h2></div><IconButton onClick={onClose} aria-label="Close form"><X size={19} /></IconButton></div>
        {children}
      </div>
    </div>
  );
}

export function ReportsPage({ data, view }: { data: ReportsData; view: ReportsView }) {
  const router = useRouter();
  const [modal, setModal] = useState<"daily" | "weekly" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish(message: string) {
    setModal(null); setSuccess(message); router.refresh();
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Reports</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to review your execution.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your reports are private to your authenticated workspace.</p></div>;

  const tabs: Array<{ key: ReportsView; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><BarChart3 size={14} />Measure → review → adjust</p><Badge tone="primary" dot>Reports</Badge></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">See what actually happened.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Derived metrics come from real execution data. Your reflections are yours to write.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Private workspace</div>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Report views">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.key === "overview" ? "/reports" : `/reports/${tab.key}`} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${view === tab.key ? "bg-[var(--primary)] text-white" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`} aria-current={view === tab.key ? "page" : undefined}>{tab.label}</Link>
        ))}
      </nav>

      {error ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}
      {success ? <div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}

      {view === "overview" ? <OverviewView data={data} onOpen={setModal} /> : null}
      {view === "daily" ? <DailyView data={data} onOpen={setModal} /> : null}
      {view === "weekly" ? <WeeklyView data={data} onOpen={setModal} /> : null}
      {view === "monthly" ? <MonthlyView data={data} onOpen={setModal} /> : null}

      {modal === "daily" ? <DailyReportModal data={data} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await saveDailyReportAction(form); if (!result.ok) { setError(result.error); return; } finish("Daily report saved."); }); }} /> : null}
      {modal === "weekly" ? <WeeklyReviewModal data={data} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await saveWeeklyReviewAction(form); if (!result.ok) { setError(result.error); return; } finish("Weekly review saved."); }); }} /> : null}
      {modal === "monthly" ? <MonthlyReviewModal data={data} pending={pending} error={error} onClose={() => setModal(null)} onSubmit={(form) => { setError(null); startTransition(async () => { const result = await saveMonthlyReviewAction(form); if (!result.ok) { setError(result.error); return; } finish("Monthly review saved."); }); }} /> : null}
    </div>
  );
}

function OverviewView({ data, onOpen }: { data: ReportsData; onOpen: (view: "daily" | "weekly" | "monthly") => void }) {
  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Execution summary">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><CalendarDays size={15} />Today</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.todayTotalCount > 0 ? `${data.todayCompletedCount} of ${data.todayTotalCount} tasks` : "No tasks planned"}</h2></div><ProgressRing value={data.todayCompletionPercent} size={72} label="today" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><MetricCard label="Focus time" value={formatMinutes(data.focusedMinutesToday)} /><MetricCard label="Daily minimum" value={data.dailyMinimumComplete ? "Complete" : "Open"} /></div>
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("daily")}><FileText size={16} />{data.dailyReport ? "Edit daily report" : "Write daily report"}</Button></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><ClipboardList size={15} />This week</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.weekTotalCount > 0 ? `${data.weekCompletedCount} of ${data.weekTotalCount} tasks` : "No tasks planned"}</h2></div><Badge tone={data.weeklyReview ? "success" : "neutral"}>{data.weeklyReview ? "Reviewed" : "Open"}</Badge></div>
          <div className="mt-5"><ProgressBar value={data.weekCompletionPercent} label="Weekly execution" tone="violet" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><MetricCard label="Focus time" value={formatMinutes(data.weekFocusedMinutes)} /><MetricCard label="Active days" value={`${data.weekActiveDays} / ${data.weekEligibleDays}`} /></div>
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("weekly")}><NotebookPen size={16} />{data.weeklyReview ? "Edit weekly review" : "Write weekly review"}</Button></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--success)]"><Target size={15} />{monthLabel(data.currentMonthStart)}</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.monthTotalCount > 0 ? `${data.monthCompletedCount} of ${data.monthTotalCount} tasks` : "No tasks planned"}</h2></div><Badge tone={data.monthlyReview ? "success" : "neutral"}>{data.monthlyReview ? "Reviewed" : "Open"}</Badge></div>
          <div className="mt-5"><ProgressBar value={data.monthCompletionPercent} label="Monthly execution" tone="success" /></div>
          <div className="mt-5 grid grid-cols-2 gap-3"><MetricCard label="Focus time" value={formatMinutes(data.monthFocusedMinutes)} /><MetricCard label="Active days" value={`${data.monthActiveDays} / ${data.monthEligibleDays}`} /></div>
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("monthly")}><NotebookPen size={16} />{data.monthlyReview ? "Edit monthly review" : "Write monthly review"}</Button></div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="streak-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]"><Flame size={15} />Consistency</p><h2 id="streak-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.currentStreak > 0 ? `${data.currentStreak} day streak` : "No active streak"}</h2></div><div className="flex gap-6 text-sm"><div><p className="text-xs text-[var(--muted)]">Longest</p><p className="mt-1 font-semibold">{data.longestStreak} days</p></div><div><p className="text-xs text-[var(--muted)]">Productive days</p><p className="mt-1 font-semibold">{data.productiveDays}</p></div></div></div>
      </section>

      <section className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-8" aria-labelledby="loop-heading">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Zap size={15} />Review → plan loop</p>
        <h2 id="loop-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Close the loop.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">Weekly review feeds next week&apos;s focus. Monthly review feeds next month&apos;s objective. You stay in control of every plan.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/planning" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open planning <ArrowRight size={16} /></Link><Link href="/today" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open today <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  );
}

function DailyView({ data, onOpen }: { data: ReportsData; onOpen: (view: "daily") => void }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="daily-metrics-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><CalendarDays size={15} />{data.today}</p><h2 id="daily-metrics-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Today&apos;s execution</h2></div><ProgressRing value={data.todayCompletionPercent} label="today" /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Tasks" value={data.todayTotalCount > 0 ? `${data.todayCompletedCount} / ${data.todayTotalCount}` : "None planned"} /><MetricCard label="Focus time" value={formatMinutes(data.focusedMinutesToday)} /><MetricCard label="Daily minimum" value={data.dailyMinimumComplete ? "Complete" : "Open"} /></div>
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="daily-report-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><FileText size={15} />Daily report</p><h2 id="daily-report-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.dailyReport ? "Report submitted." : "No report yet."}</h2></div><Badge tone={data.dailyReport ? "success" : "neutral"}>{data.dailyReport ? "Submitted" : "Open"}</Badge></div>
        {data.dailyReport ? <div className="mt-4 space-y-3 text-sm">{data.dailyReport.wins ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Wins: </span>{data.dailyReport.wins}</p> : null}{data.dailyReport.blockers ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Blockers: </span>{data.dailyReport.blockers}</p> : null}{data.dailyReport.energy ? <p className="text-[var(--muted)]">Energy: {data.dailyReport.energy}/10</p> : null}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Log what you accomplished and what got in the way.</p>}
        <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("daily")}><FileText size={16} />{data.dailyReport ? "Edit report" : "Write report"}</Button></div>
      </section>
    </div>
  );
}

function WeeklyView({ data, onOpen }: { data: ReportsData; onOpen: (view: "weekly") => void }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-[var(--violet-tint)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="weekly-metrics-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><ClipboardList size={15} />Week of {data.currentWeekStart}</p><h2 id="weekly-metrics-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Weekly execution</h2></div><ProgressRing value={data.weekCompletionPercent} label="week" /></div>
        <div className="mt-6"><ProgressBar value={data.weekCompletionPercent} label={data.weekTotalCount > 0 ? `${data.weekCompletedCount} of ${data.weekTotalCount} tasks complete` : "No tasks planned this week"} tone="violet" /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Focus time" value={formatMinutes(data.weekFocusedMinutes)} /><MetricCard label="Active days" value={`${data.weekActiveDays} / ${data.weekEligibleDays}`} /><MetricCard label="Completion" value={data.weekTotalCount > 0 ? `${data.weekCompletionPercent}%` : "No data"} /></div>
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="weekly-review-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><NotebookPen size={15} />Weekly review</p><h2 id="weekly-review-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.weeklyReview ? "Review submitted." : "No review yet."}</h2></div><Badge tone={data.weeklyReview ? "success" : "neutral"}>{data.weeklyReview ? "Reviewed" : "Open"}</Badge></div>
        {data.weeklyReview ? <div className="mt-4 space-y-3 text-sm">{data.weeklyReview.summary ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Summary: </span>{data.weeklyReview.summary}</p> : null}{data.weeklyReview.lessons ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Lessons: </span>{data.weeklyReview.lessons}</p> : null}{data.weeklyReview.nextFocus ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Next focus: </span>{data.weeklyReview.nextFocus}</p> : null}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Reflect on the week and set next week&apos;s focus.</p>}
        <div className="mt-5 flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => onOpen("weekly")}><NotebookPen size={16} />{data.weeklyReview ? "Edit review" : "Write review"}</Button><Link href="/planning/week/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Plan next week <ArrowRight size={16} /></Link></div>
      </section>
    </div>
  );
}

function MonthlyView({ data, onOpen }: { data: ReportsData; onOpen: (view: "monthly") => void }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-[var(--success-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="monthly-metrics-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--success)]"><Target size={15} />{monthLabel(data.currentMonthStart)}</p><h2 id="monthly-metrics-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Monthly execution</h2></div><ProgressRing value={data.monthCompletionPercent} label="month" /></div>
        <div className="mt-6"><ProgressBar value={data.monthCompletionPercent} label={data.monthTotalCount > 0 ? `${data.monthCompletedCount} of ${data.monthTotalCount} tasks complete` : "No tasks planned this month"} tone="success" /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Focus time" value={formatMinutes(data.monthFocusedMinutes)} /><MetricCard label="Active days" value={`${data.monthActiveDays} / ${data.monthEligibleDays}`} /><MetricCard label="Completion" value={data.monthTotalCount > 0 ? `${data.monthCompletionPercent}%` : "No data"} /></div>
      </section>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="monthly-review-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><NotebookPen size={15} />Monthly review</p><h2 id="monthly-review-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">{data.monthlyReview ? "Review submitted." : "No review yet."}</h2></div><Badge tone={data.monthlyReview ? "success" : "neutral"}>{data.monthlyReview ? "Reviewed" : "Open"}</Badge></div>
        {data.monthlyReview ? <div className="mt-4 space-y-3 text-sm">{data.monthlyReview.wins ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Wins: </span>{data.monthlyReview.wins}</p> : null}{data.monthlyReview.misses ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Misses: </span>{data.monthlyReview.misses}</p> : null}{data.monthlyReview.lessons ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Lessons: </span>{data.monthlyReview.lessons}</p> : null}{data.monthlyReview.nextObjective ? <p className="leading-6 text-[var(--ink-soft)]"><span className="font-semibold text-[var(--ink)]">Next objective: </span>{data.monthlyReview.nextObjective}</p> : null}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Compare plan vs. actual, then set next month&apos;s objective.</p>}
        <div className="mt-5"><Button type="button" variant="secondary" onClick={() => onOpen("monthly")}><NotebookPen size={16} />{data.monthlyReview ? "Edit review" : "Write review"}</Button></div>
      </section>
    </div>
  );
}

function DailyReportModal({ data, pending, error, onClose, onSubmit }: { data: ReportsData; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { wins: string; blockers: string; energy: string }) => void }) {
  const [form, setForm] = useState({ wins: data.dailyReport?.wins ?? "", blockers: data.dailyReport?.blockers ?? "", energy: data.dailyReport?.energy ? String(data.dailyReport.energy) : "" });
  return (
    <ModalShell badge="Daily report" title="Log today's execution." onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <TextAreaField label="What went well" value={form.wins} onChange={(value) => setForm({ ...form, wins: value })} placeholder="The work you actually completed today." maxLength={2000} />
        <TextAreaField label="Blockers / what didn't happen" value={form.blockers} onChange={(value) => setForm({ ...form, blockers: value })} placeholder="What got in the way, or what you deferred." maxLength={2000} />
        <label className="block text-sm font-semibold">Energy (1–10)<input type="number" min="1" max="10" value={form.energy} onChange={(event) => setForm({ ...form, energy: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="7" /></label>
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save report"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}

function WeeklyReviewModal({ data, pending, error, onClose, onSubmit }: { data: ReportsData; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { summary: string; lessons: string; nextFocus: string }) => void }) {
  const [form, setForm] = useState({ summary: data.weeklyReview?.summary ?? "", lessons: data.weeklyReview?.lessons ?? "", nextFocus: data.weeklyReview?.nextFocus ?? "" });
  return (
    <ModalShell badge="Weekly review" title="Close out the week." onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <TextAreaField label="Summary" value={form.summary} onChange={(value) => setForm({ ...form, summary: value })} placeholder="What this week actually produced." maxLength={2000} />
        <TextAreaField label="Lessons" value={form.lessons} onChange={(value) => setForm({ ...form, lessons: value })} placeholder="What you learned that changes next week." maxLength={2000} />
        <TextAreaField label="Next focus" value={form.nextFocus} onChange={(value) => setForm({ ...form, nextFocus: value })} placeholder="The one thing to carry into next week." maxLength={2000} />
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save review"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}

function MonthlyReviewModal({ data, pending, error, onClose, onSubmit }: { data: ReportsData; pending: boolean; error: string | null; onClose: () => void; onSubmit: (form: { wins: string; misses: string; blockers: string; lessons: string; nextObjective: string }) => void }) {
  const [form, setForm] = useState({ wins: data.monthlyReview?.wins ?? "", misses: data.monthlyReview?.misses ?? "", blockers: data.monthlyReview?.blockers ?? "", lessons: data.monthlyReview?.lessons ?? "", nextObjective: data.monthlyReview?.nextObjective ?? "" });
  return (
    <ModalShell badge="Monthly review" title="Compare plan vs. actual." onClose={onClose}>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <TextAreaField label="Major wins" value={form.wins} onChange={(value) => setForm({ ...form, wins: value })} placeholder="What actually landed this month." maxLength={2000} />
        <TextAreaField label="Major misses" value={form.misses} onChange={(value) => setForm({ ...form, misses: value })} placeholder="What didn't happen that you planned." maxLength={2000} />
        <TextAreaField label="Blockers" value={form.blockers} onChange={(value) => setForm({ ...form, blockers: value })} placeholder="What got in the way." maxLength={2000} />
        <TextAreaField label="Lessons" value={form.lessons} onChange={(value) => setForm({ ...form, lessons: value })} placeholder="What you learned that changes next month." maxLength={2000} />
        <TextAreaField label="Next month's objective" value={form.nextObjective} onChange={(value) => setForm({ ...form, nextObjective: value })} placeholder="The outcome to carry into next month." maxLength={500} />
        {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save review"}<Check size={16} /></Button></div>
      </form>
    </ModalShell>
  );
}
