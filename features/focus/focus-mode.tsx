"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, CircleAlert, Clock3, Pause, Play, Square, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { AchievementFeedback } from "@/components/feedback/feedback-patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pauseFocusAction, resumeFocusAction, startFocusAction, stopFocusAction } from "@/app/actions/focus-actions";
import type { FocusData, FocusSession } from "@/features/focus/focus-data";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${hours > 0 ? `${hours}:` : ""}${minutes}:${seconds}`;
}

function elapsedSeconds(session: FocusSession | null, now: number) {
  if (!session) return 0;
  const activeSeconds = session.status === "active" && session.activeStartedAt ? Math.max(0, Math.floor((now - new Date(session.activeStartedAt).getTime()) / 1000)) : 0;
  return session.durationSeconds + activeSeconds;
}

export function FocusMode({ data }: { data: FocusData }) {
  const router = useRouter();
  const [session, setSession] = useState<FocusSession | null>(data.session);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(data.error);
  const [completed, setCompleted] = useState<{ durationSeconds: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const task = data.task;

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const handleVisibility = () => setNow(Date.now());
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [session]);

  const duration = useMemo(() => elapsedSeconds(session, now), [now, session]);

  function start() {
    if (!task) return;
    setError(null);
    startTransition(async () => {
      const result = await startFocusAction(task.id);
      if (!result.ok || !result.sessionId) { setError(result.ok ? "The focus session could not be identified." : result.error); return; }
      const startedAt = new Date().toISOString();
      setSession({ id: result.sessionId, taskId: task.id, startedAt, activeStartedAt: startedAt, pausedAt: null, endedAt: null, durationSeconds: 0, status: "active" });
      setNow(Date.now());
    });
  }

  function pause() {
    if (!session) return;
    startTransition(async () => {
      const result = await pauseFocusAction(session.id);
      if (!result.ok) { setError(result.error); return; }
      const pausedAt = new Date().toISOString();
      setSession({ ...session, status: "paused", activeStartedAt: null, pausedAt, durationSeconds: result.durationSeconds ?? duration });
      setNow(Date.now());
    });
  }

  function resume() {
    if (!session) return;
    startTransition(async () => {
      const result = await resumeFocusAction(session.id);
      if (!result.ok) { setError(result.error); return; }
      setSession({ ...session, status: "active", activeStartedAt: new Date().toISOString(), pausedAt: null, durationSeconds: result.durationSeconds ?? session.durationSeconds });
      setNow(Date.now());
    });
  }

  function stop(completeTask: boolean) {
    if (!session) { router.push("/"); return; }
    startTransition(async () => {
      const result = await stopFocusAction(session.id, completeTask);
      if (!result.ok) { setError(result.error); return; }
      if (completeTask) { setCompleted({ durationSeconds: result.durationSeconds ?? duration }); return; }
      router.push("/");
    });
  }

  if (!data.authenticated) return <FocusShell><Badge tone="primary">Focus Mode</Badge><h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em]">Sign in to start focused work.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Focus sessions belong to your private workspace and are never created without an authenticated user.</p><Link href="/" className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-semibold"><ArrowLeft size={16} />Back to dashboard</Link></FocusShell>;
  if (!task) return <FocusShell><Badge tone="warning">Task unavailable</Badge><h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em]">Choose a task before focusing.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">The task ID was missing or it does not belong to your workspace.</p><Link href="/tasks" className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"><ArrowLeft size={16} />Choose a task</Link></FocusShell>;
  if (completed) return <FocusShell><Badge tone="success" dot>Session complete</Badge><span className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--success-tint)] text-[var(--success)]"><Check size={32} /></span><h1 className="mt-6 text-3xl font-semibold tracking-[-0.05em]">Task complete. Nice work.</h1><p className="mt-3 text-sm text-[var(--muted)]">{task.title}</p><div className="mx-auto mt-8 max-w-xs rounded-2xl bg-[var(--focus-surface)] p-5"><p className="text-xs uppercase tracking-[0.14em] text-[var(--focus-muted)]">Focused duration</p><p className="mt-2 text-3xl font-semibold text-[var(--focus-ink)]">{formatDuration(completed.durationSeconds)}</p></div><AchievementFeedback title="Execution logged" detail="Your task completion is now reflected in the system." /><Link href="/" className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white"><ArrowLeft size={16} />Return to dashboard</Link></FocusShell>;

  return <FocusShell><div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--focus-accent)]"><Zap size={15} />USMANI OS · Focus Mode</div><Badge tone={session?.status === "paused" ? "warning" : session ? "success" : "primary"}>{session?.status === "paused" ? "Paused" : session ? "In focus" : "Ready"}</Badge><h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-[var(--focus-ink)] sm:text-6xl">{task.title}</h1>{task.description ? <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--focus-muted)]">{task.description}</p> : null}<div className="mt-10 rounded-[2rem] border border-[var(--focus-line)] bg-[var(--focus-surface)] px-6 py-8 shadow-[var(--focus-shadow)] sm:px-12"><p className="text-xs uppercase tracking-[0.18em] text-[var(--focus-muted)]">Elapsed time</p><p className="mt-3 font-mono text-6xl font-semibold tracking-[-0.08em] text-[var(--focus-ink)] sm:text-8xl" aria-live="polite">{formatDuration(duration)}</p>{task.estimatedMinutes ? <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--focus-muted)]"><Clock3 size={14} />Estimated {task.estimatedMinutes} minutes</p> : null}<div className="mt-8 flex flex-wrap justify-center gap-3">{!session ? <Button type="button" onClick={start} disabled={pending}><Play size={17} />{pending ? "Starting..." : "Start session"}</Button> : session.status === "active" ? <Button type="button" variant="secondary" onClick={pause} disabled={pending}><Pause size={17} />Pause</Button> : <Button type="button" onClick={resume} disabled={pending}><Play size={17} />Resume</Button>} {session ? <Button type="button" variant="secondary" onClick={() => stop(false)} disabled={pending}><Square size={16} />Exit session</Button> : null}</div></div>{session ? <Button type="button" className="mt-5" onClick={() => stop(true)} disabled={pending}><Check size={17} />Complete task and stop</Button> : null}{error ? <p className="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={16} />{error}</p> : null}<Link href="/tasks" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--focus-muted)] hover:text-[var(--focus-ink)]"><ArrowLeft size={16} />Back to tasks</Link></FocusShell>;
}

function FocusShell({ children }: { children: ReactNode }) {
  return <section className="focus-mode min-h-screen bg-[var(--focus-canvas)] px-5 py-10 text-center sm:px-8 lg:px-12"><div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col items-center justify-center">{children}</div></section>;
}
