"use client";

import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Check, CircleDot, Flame, Map, ShieldCheck, Target, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AchievementFeedback, EmptyState, LoadingState, TaskState } from "@/components/feedback/feedback-patterns";
import { MetricCard } from "@/components/metrics/metric-card";
import { CompletionIndicator, ProgressBar, ProgressRing, StreakIndicator } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DesignPreviewPage() {
  const [taskComplete, setTaskComplete] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
          <div>
            <Badge tone="violet" dot>Design system preview</Badge>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">A system that makes execution visible.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">A working canvas for USMANI OS&apos;s visual language. Every example below is reusable presentation, not a feature or data workflow.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowLoading(!showLoading)}>{showLoading ? "Hide loading" : "Show loading"}</Button>
            <Button type="button" onClick={() => setTaskComplete(!taskComplete)}>{taskComplete ? "Reset example" : "Complete example"}<Check size={16} /></Button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Metric card examples">
          <MetricCard label="Focused minutes" value="142" detail="+18% from last week" icon={Zap} />
          <MetricCard label="Roadmap progress" value="68%" detail="Foundation phase" icon={Map} tone="violet" />
          <MetricCard label="Current streak" value="12" detail="Best: 21 days" icon={Flame} tone="warning" />
          <MetricCard label="Business signal" value="3.4x" detail="Promising experiment" icon={BriefcaseBusiness} tone="success" />
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" aria-labelledby="progress-heading">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Progress language</p><h2 id="progress-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">Small signals. Clear direction.</h2></div>
              <ProgressRing value={68} />
            </div>
            <div className="mt-8 space-y-5">
              <ProgressBar value={22} label="Early progress · neutral" tone="neutral" />
              <ProgressBar value={61} label="In motion · primary" />
              <ProgressBar value={88} label="Strong progress · violet" tone="violet" />
              <ProgressBar value={100} label="Complete · success" tone="success" />
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">Reward feedback</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Make progress feel real.</h2>
            <div className="mt-6 space-y-3">
              <AchievementFeedback title="Daily minimum complete" detail="+25 min focused work" />
              <AchievementFeedback tone="primary" title="Milestone unlocked" detail="Foundation is taking shape" />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3" aria-label="State examples">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Task state</p>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={() => setTaskComplete(!taskComplete)} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2" aria-label={taskComplete ? "Mark task incomplete" : "Mark task complete"}>
                <CompletionIndicator complete={taskComplete} />
              </button>
              <div className={taskComplete ? "text-[var(--muted)] line-through" : ""}><p className="text-sm font-semibold">Define the next action</p><p className="mt-1 text-xs text-[var(--muted)]">A clear next step beats a perfect plan.</p></div>
            </div>
            <div className="mt-5 flex items-center justify-between"><TaskState state={taskComplete ? "complete" : "active"} /><ArrowRight size={16} className="text-[var(--muted)]" aria-hidden="true" /></div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">Streak indicator</p>
            <div className="mt-6"><StreakIndicator days={12} /></div>
            <div className="mt-6 flex flex-wrap gap-2"><Badge tone="success" dot>On track</Badge><Badge tone="warning" dot>Recovery ready</Badge><Badge tone="danger" dot>Needs attention</Badge></div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--violet)]">Status language</p>
            <div className="mt-5 flex flex-wrap gap-2"><Badge tone="neutral">Draft</Badge><Badge tone="primary">In progress</Badge><Badge tone="violet">Strategy</Badge><Badge tone="success">Complete</Badge></div>
            <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-[var(--muted)]"><ShieldCheck size={16} className="text-[var(--success)]" />Clear states keep attention on the next move.</p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2" aria-label="Empty and loading examples">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Empty state</p><EmptyState title="Nothing here yet" detail="Start with one useful commitment and build from there." /></div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Loading state</p>{showLoading ? <LoadingState /> : <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] text-center text-xs text-[var(--muted)]"><CircleDot size={18} className="mr-2" />Ready when the data is real.</div>}</div>
        </section>

        <footer className="mt-10 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]"><Target size={15} aria-hidden="true" /> Design foundation only · No database data is connected.</footer>
      </div>
    </AppShell>
  );
}
