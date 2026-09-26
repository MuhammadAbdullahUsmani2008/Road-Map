import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, CalendarRange, CheckCircle2, FileText, Map, Plus, Rocket, Settings2, Target, Trophy, WalletCards, Zap } from "lucide-react";
import { AchievementFeedback, EmptyState, TaskState } from "@/components/feedback/feedback-patterns";
import { ProgressRing, StreakIndicator } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { DashboardTaskList } from "@/features/dashboard/dashboard-task-list";
import type { DashboardData } from "@/features/dashboard/dashboard-data";

type DashboardViewProps = { data: DashboardData };

const stateCopy = {
  NEW: { eyebrow: "A clean start", message: "Today is still available. Start with one task.", tone: "primary" as const },
  ACTIVE: { eyebrow: "In motion", message: "One focused session is enough to move today forward.", tone: "primary" as const },
  STREAK_RISK: { eyebrow: "Protect the streak", message: "Your next meaningful action keeps the chain alive.", tone: "warning" as const },
  COMPLETED: { eyebrow: "Minimum complete", message: "You built today’s floor. Keep going if the work is clear.", tone: "success" as const },
};

function ActionLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${primary ? "bg-[var(--primary)] text-white shadow-[0_6px_16px_var(--primary-shadow)] hover:bg-[var(--primary-hover)]" : "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"}`}>{children}</Link>;
}

function formatMetric(value: number, unit: string | null) {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function DashboardView({ data }: DashboardViewProps) {
  const copy = stateCopy[data.state];
  const mostImportantTask = data.tasks.find((task) => task.id === data.mostImportantTaskId) ?? null;
  const greeting = data.displayName ? `Good morning, ${data.displayName}.` : data.authenticated ? "Your operating system is ready." : "Welcome to USMANI OS.";
  const taskSummary = data.taskCount > 0 ? `${data.completedTaskCount} of ${data.taskCount} tasks complete` : "No tasks planned yet";

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><CalendarDays size={14} />{data.displayDate}</p><Badge tone={copy.tone} dot>{copy.eyebrow}</Badge></div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.06em] sm:text-5xl">{greeting}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">{copy.message} <span className="text-[var(--ink-soft)]">Don&apos;t depend on motivation. Build the system.</span></p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />{data.authenticated ? "Private workspace" : "Preview mode · no account connected"}</div>
      </header>

      {data.error ? <div className="mt-6 rounded-2xl border border-[var(--danger-tint)] bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert">{data.error}</div> : null}

      {!data.authenticated ? (
        <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-8" aria-labelledby="welcome-heading">
          <div className="max-w-2xl"><Badge tone="primary">Your command center</Badge><h2 id="welcome-heading" className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Your personal system is ready for its first signal.</h2><p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">Sign in to load your private tasks, roadmap, streaks, business metrics, and milestones. Nothing is fabricated while your workspace is disconnected.</p><div className="mt-6 flex flex-wrap gap-3"><ActionLink href="/tasks" primary>Plan today&apos;s first task <ArrowRight size={16} /></ActionLink><ActionLink href="/roadmap">Set up roadmap</ActionLink></div></div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-labelledby="today-heading">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Target size={15} />Today command center</div><h2 id="today-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Make today count in one clear move.</h2><p className="mt-2 text-sm text-[var(--muted)]">{taskSummary}. Daily minimum: {data.dailyMinimumTasks} meaningful completed task.</p></div>
            <ProgressRing value={data.completionPercent} label="today" />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Completion</p><p className="mt-2 text-xl font-semibold">{data.completionPercent}%</p></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Focused time</p><p className="mt-2 text-xl font-semibold">Not tracked</p></div><div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--muted)]">Daily minimum</p><p className="mt-2 text-xl font-semibold">{data.dailyMinimumComplete ? "Complete" : "Open"}</p></div></div>
          <div className="mt-6 flex flex-wrap gap-3">{mostImportantTask ? <ActionLink href={`/focus?task=${mostImportantTask.id}`} primary><Zap size={16} />Start Focus</ActionLink> : <ActionLink href="/tasks" primary><Plus size={16} />Create first task</ActionLink>}<ActionLink href="/today" primary><CalendarDays size={16} />Open Today</ActionLink><ActionLink href="/reports/daily"><FileText size={16} />Daily report</ActionLink></div>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]">🔥 Streak</p>{data.currentStreak > 0 ? <div className="mt-6"><StreakIndicator days={data.currentStreak} /><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[var(--muted)]">Longest</p><p className="mt-1 font-semibold">{data.longestStreak} days</p></div><div><p className="text-xs text-[var(--muted)]">Productive days</p><p className="mt-1 font-semibold">{data.productiveDays}</p></div></div></div> : <div className="mt-6"><EmptyState title="Your streak starts today." detail={data.authenticated ? "Complete one meaningful task to create the first signal." : "Sign in to begin tracking your execution history."} /></div>}</div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="priority-heading">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]"><Rocket size={15} />Most important task</p><h2 id="priority-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{mostImportantTask?.title ?? "Choose one meaningful target."}</h2></div>{mostImportantTask ? <Badge tone={mostImportantTask.priority <= 2 ? "danger" : "primary"}>P{mostImportantTask.priority}</Badge> : null}</div>{mostImportantTask ? <><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">{mostImportantTask.description || "No description added yet. The next clear action is enough."}</p><div className="mt-5 flex flex-wrap items-center gap-3"><TaskState state={mostImportantTask.completedToday ? "complete" : mostImportantTask.status === "cancelled" ? "blocked" : "active"} />{mostImportantTask.dueOn ? <span className="text-xs text-[var(--muted)]">Due {mostImportantTask.dueOn}</span> : null}</div><div className="mt-6 flex flex-wrap gap-3"><ActionLink href={`/focus?task=${mostImportantTask.id}`} primary><Zap size={16} />Start Focus</ActionLink><ActionLink href={`/tasks?task=${mostImportantTask.id}`}>View details <ArrowRight size={16} /></ActionLink></div></> : <><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">There is no task data to prioritize yet. Start with one useful commitment for today.</p><div className="mt-6"><ActionLink href="/tasks" primary>Create today&apos;s first task <ArrowRight size={16} /></ActionLink></div></>}</div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Today&apos;s tasks</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">The next actions</h2></div><Badge tone={data.taskCount > 0 ? "primary" : "neutral"}>{data.taskCount} total</Badge></div><div className="mt-5"><DashboardTaskList tasks={data.tasks} mostImportantTaskId={data.mostImportantTaskId} /></div></div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="Long-term progress">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]"><Map size={15} />Roadmap</div><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{data.roadmap?.goalTitle ?? data.roadmap?.yearTitle ?? "Your roadmap is ready to be activated."}</h2>{data.roadmap ? <><p className="mt-2 text-sm text-[var(--muted)]">{data.roadmap.objective || "Current direction is set. Keep the next phase visible."}</p><div className="mt-6 grid grid-cols-2 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:grid-cols-4"><div className="rounded-lg bg-[var(--primary-tint)] px-2 py-3 text-[var(--primary)]">Year {data.roadmap.year}</div><div className="rounded-lg bg-[var(--violet-tint)] px-2 py-3 text-[var(--violet)]">{data.roadmap.phaseTitle ?? "Phase"}</div><div className="rounded-lg bg-[var(--surface-muted)] px-2 py-3">{data.roadmap.monthTitle ?? "Month"}</div><div className="rounded-lg bg-[var(--success-tint)] px-2 py-3 text-[var(--success)]">{data.roadmap.weekTitle ?? "Week"}</div></div></> : <div className="mt-5"><ActionLink href="/roadmap">Set up roadmap <ArrowRight size={16} /></ActionLink></div>}</div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--success)]"><WalletCards size={15} />Business snapshot</div><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{data.businessMetrics.length > 0 ? "Latest signals" : "Business tracking isn't active yet."}</h2>{data.businessMetrics.length > 0 ? <div className="mt-5 space-y-3">{data.businessMetrics.map((metric) => <div key={`${metric.name}-${metric.metricDate}`} className="flex items-center justify-between gap-4 text-sm"><span className="text-[var(--muted)]">{metric.name}</span><span className="font-semibold">{formatMetric(metric.value, metric.unit)}</span></div>)}</div> : <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Add a metric when you have a real signal worth tracking.</p>}<div className="mt-6"><ActionLink href="/business">{data.businessMetrics.length > 0 ? "View business" : "Start tracking"} <ArrowRight size={16} /></ActionLink></div></div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]"><Trophy size={15} />Latest achievement</div>{data.latestMilestone ? <><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">🏆 {data.latestMilestone.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{data.latestMilestone.description || "A meaningful marker in the system."}</p><div className="mt-5"><Badge tone="success" dot>{data.latestMilestone.status}</Badge></div></> : <><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]">Your first milestone is waiting.</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Make the next useful commitment visible, then mark the moment it becomes real.</p></>}</div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]" aria-labelledby="quick-actions-heading"><div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Settings2 size={15} />Quick actions</p><h2 id="quick-actions-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">Keep the next move close.</h2></div><CheckCircle2 className="text-[var(--success)]" size={22} aria-hidden="true" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><ActionLink href="/tasks" primary><Plus size={16} />Add task</ActionLink><ActionLink href={mostImportantTask ? `/focus?task=${mostImportantTask.id}` : "/focus"}><Zap size={16} />Start focus</ActionLink><ActionLink href="/reports/daily"><FileText size={16} />Daily report</ActionLink><ActionLink href="/roadmap"><Map size={16} />View roadmap</ActionLink><ActionLink href="/planning"><CalendarRange size={16} />Planning</ActionLink></div></section>

      {data.dailyMinimumComplete ? <div className="mt-6"><AchievementFeedback title="Daily minimum complete" detail="You protected the floor. + one meaningful task logged." /></div> : null}
      <footer className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">Daily minimum is currently one completed meaningful task. Focused time will appear when a focus-session record exists.</footer>
    </div>
  );
}
