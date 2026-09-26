"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, Clock3, Edit3, Filter, ListChecks, Plus, Search, Trash2, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTaskAction, createTaskAction, deleteTaskAction, reopenTaskAction, updateTaskAction } from "@/app/actions/task-actions";
import type { TaskRecord, TasksData } from "@/features/tasks/tasks-data";
import { Badge } from "@/components/ui/badge";
import { CompletionIndicator } from "@/components/progress/progress-visuals";
import { Button, IconButton } from "@/components/ui/button";

const filters = ["today", "overdue", "upcoming", "all", "completed"] as const;
type TaskFilter = (typeof filters)[number];

type FormState = { title: string; description: string; priority: string; dueOn: string; estimatedMinutes: string; roadmapWeekId: string };
const blankForm: FormState = { title: "", description: "", priority: "3", dueOn: "", estimatedMinutes: "", roadmapWeekId: "" };

function priorityLabel(priority: number) {
  if (priority <= 2) return { label: "High", tone: "danger" as const };
  if (priority === 3) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

function sortTasks(tasks: TaskRecord[], today: string) {
  return [...tasks].sort((left, right) => {
    const leftComplete = left.completedToday || left.status === "completed";
    const rightComplete = right.completedToday || right.status === "completed";
    if (leftComplete !== rightComplete) return leftComplete ? 1 : -1;
    if (left.priority !== right.priority) return left.priority - right.priority;
    const leftOverdue = Boolean(left.dueOn && left.dueOn < today && !leftComplete);
    const rightOverdue = Boolean(right.dueOn && right.dueOn < today && !rightComplete);
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
    return (left.dueOn ?? "9999-12-31").localeCompare(right.dueOn ?? "9999-12-31") || left.createdAt.localeCompare(right.createdAt);
  });
}

function matchesFilter(task: TaskRecord, filter: TaskFilter, today: string) {
  const complete = task.completedToday || task.status === "completed";
  if (filter === "completed") return complete;
  if (filter === "today") return task.dueOn === today || task.scheduledFor === today || task.status === "in_progress";
  if (filter === "overdue") return !complete && Boolean(task.dueOn && task.dueOn < today);
  if (filter === "upcoming") return !complete && Boolean(task.dueOn && task.dueOn > today);
  return true;
}

function TaskForm({ initial, roadmapWeeks, editing, pending, error, onSubmit, onClose }: { initial: FormState; roadmapWeeks: TasksData["roadmapWeeks"]; editing: boolean; pending: boolean; error: string | null; onSubmit: (form: FormState) => void; onClose: () => void }) {
  const [form, setForm] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <div className="flex items-start justify-between gap-4"><div><Badge tone="primary">{editing ? "Edit task" : "New task"}</Badge><h2 id="task-form-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{editing ? "Refine the next action." : "Turn intent into an action."}</h2></div><IconButton onClick={onClose} aria-label="Close task form"><X size={19} /></IconButton></div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">Title<span className="ml-1 text-[var(--danger)]">*</span><input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="Create 3 product creatives" required maxLength={160} /></label>
          <label className="block text-sm font-semibold">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder="What does done look like?" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"><option value="1">High</option><option value="3">Medium</option><option value="5">Low</option></select></label><label className="block text-sm font-semibold">Estimated minutes<input type="number" min="1" max="1440" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]" placeholder="45" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Due date<input type="date" value={form.dueOn} onChange={(event) => setForm({ ...form, dueOn: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]" /></label><label className="block text-sm font-semibold">Roadmap week<select value={form.roadmapWeekId} onChange={(event) => setForm({ ...form, roadmapWeekId: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"><option value="">No roadmap link</option>{roadmapWeeks.map((week) => <option key={week.id} value={week.id}>{week.label}</option>)}</select></label></div>
          <p className="text-xs leading-5 text-[var(--muted)]">The current schema supports priority, due date, estimated time, and roadmap-week links. Category and milestone links are intentionally not shown because they are not stored on tasks yet.</p>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : editing ? "Save changes" : "Create task"}<Check size={16} /></Button></div>
        </form>
      </div>
    </div>
  );
}

export function TasksPage({ data, initialFilter, selectedTaskId }: { data: TasksData; initialFilter: TaskFilter; selectedTaskId?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const initialTask = selectedTaskId ? data.tasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const [modal, setModal] = useState<"create" | "edit" | null>(initialTask ? "edit" : null);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(initialTask);
  const [confirmDelete, setConfirmDelete] = useState<TaskRecord | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [localTasks, setLocalTasks] = useState(data.tasks);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortTasks(localTasks.filter((task) => matchesFilter(task, filter, data.today)).filter((task) => !query || task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query)), data.today);
  }, [data.today, filter, localTasks, search]);

  function changeFilter(nextFilter: TaskFilter) {
    setFilter(nextFilter);
    router.replace(`/tasks?filter=${nextFilter}`, { scroll: false });
  }

  function openCreate() { setEditingTask(null); setError(null); setSuccess(null); setModal("create"); }
  function openEdit(task: TaskRecord) { setEditingTask(task); setError(null); setSuccess(null); setModal("edit"); }
  function formFromTask(task: TaskRecord | null): FormState { return task ? { title: task.title, description: task.description ?? "", priority: String(task.priority), dueOn: task.dueOn ?? "", estimatedMinutes: task.estimatedMinutes ? String(task.estimatedMinutes) : "", roadmapWeekId: task.roadmapWeekId ?? "" } : blankForm; }

  function saveTask(form: FormState) {
    setError(null);
    const input = { title: form.title, description: form.description, priority: Number(form.priority), dueOn: form.dueOn || undefined, estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined, roadmapWeekId: form.roadmapWeekId || undefined };
    startTransition(async () => {
      const result = editingTask ? await updateTaskAction(editingTask.id, input) : await createTaskAction(input);
      if (!result.ok) { setError(result.error); return; }
      setModal(null); setSuccess(editingTask ? "Task updated." : "Task created."); router.refresh();
    });
  }

  function toggleTask(task: TaskRecord) {
    const complete = !(task.completedToday || task.status === "completed");
    setError(null);
    setLocalTasks((current) => current.map((item) => item.id === task.id ? { ...item, completedToday: complete, status: complete ? "completed" : "planned" } : item));
    startTransition(async () => {
      const result = complete ? await completeTaskAction(task.id) : await reopenTaskAction(task.id);
      if (!result.ok) { setLocalTasks((current) => current.map((item) => item.id === task.id ? task : item)); setError(result.error); }
      else { setSuccess(complete ? "Task completed." : "Task reopened."); router.refresh(); }
    });
  }

  function deleteTask() {
    if (!confirmDelete) return;
    const task = confirmDelete;
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (!result.ok) { setError(result.error); return; }
      setLocalTasks((current) => current.filter((item) => item.id !== task.id)); setConfirmDelete(null); setSuccess("Task deleted.");
    });
  }

  if (!data.authenticated) return <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12"><Badge tone="primary">Tasks</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to turn your roadmap into actions.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Tasks are private to your authenticated workspace. Once signed in, this is where your next actions will live.</p></div>;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end"><div><Badge tone="primary" dot>Execution system</Badge><h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">Tasks</h1><p className="mt-3 text-base text-[var(--muted)]">Turn the roadmap into today&apos;s actions.</p></div><Button type="button" onClick={openCreate}><Plus size={18} />New task</Button></header>
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><nav className="flex gap-1 overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-1" aria-label="Task filters">{filters.map((item) => <button key={item} type="button" onClick={() => changeFilter(item)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${filter === item ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>{item}</button>)}</nav><label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary-tint)]"><Search size={17} /><span className="sr-only">Search tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="w-full bg-transparent outline-none placeholder:text-[var(--muted)] lg:w-64" /></label></div>
      {error ? <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} />{error}</div> : null}{success ? <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status"><Check size={17} />{success}</div> : null}
      <section className="mt-8" aria-labelledby="task-list-heading"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"><Filter size={14} />{filter} tasks</p><h2 id="task-list-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{visibleTasks.length > 0 ? `${visibleTasks.length} action${visibleTasks.length === 1 ? "" : "s"}` : filter === "completed" ? "No completed tasks yet." : filter === "today" ? "Nothing scheduled for today." : "You have no tasks yet."}</h2></div><span className="text-xs text-[var(--muted)]">{localTasks.length} total</span></div>{visibleTasks.length > 0 ? <div className="space-y-3">{visibleTasks.map((task) => { const complete = task.completedToday || task.status === "completed"; const priority = priorityLabel(task.priority); const overdue = Boolean(task.dueOn && task.dueOn < data.today && !complete); return <article key={task.id} className={`flex flex-col gap-4 rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] sm:flex-row sm:items-center ${overdue ? "border-[var(--danger-soft)]" : "border-[var(--line)]"}`}><button type="button" onClick={() => toggleTask(task)} disabled={pending} aria-label={complete ? `Reopen ${task.title}` : `Complete ${task.title}`} className="self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-center"><CompletionIndicator complete={complete} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${complete ? "text-[var(--muted)] line-through" : ""}`}>{task.title}</h3><Badge tone={priority.tone}>{priority.label}</Badge>{task.status === "in_progress" ? <Badge tone="primary">In progress</Badge> : null}</div>{task.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{task.description}</p> : null}<div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">{task.dueOn ? <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-[var(--danger)]" : ""}`}><CalendarClock size={13} />{overdue ? "Overdue" : `Due ${task.dueOn}`}</span> : null}{task.estimatedMinutes ? <span className="inline-flex items-center gap-1"><Clock3 size={13} />{task.estimatedMinutes} min</span> : null}{task.roadmapWeekId ? <Badge tone="violet">Roadmap linked</Badge> : null}</div></div><div className="flex items-center gap-1 self-end sm:self-center"><Link href={`/focus?task=${task.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--primary-tint)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" aria-label={`Start focus on ${task.title}`}><Zap size={17} /></Link><button type="button" onClick={() => openEdit(task)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" aria-label={`Edit ${task.title}`}><Edit3 size={17} /></button><button type="button" onClick={() => setConfirmDelete(task)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--danger-tint)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" aria-label={`Delete ${task.title}`}><Trash2 size={17} /></button><Link href={`/tasks?task=${task.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" aria-label={`View details for ${task.title}`}><ArrowRight size={17} /></Link></div></article>; })}</div> : <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-10 text-center"><ListChecks className="mx-auto text-[var(--muted)]" size={30} /><p className="mt-4 text-lg font-semibold">{filter === "completed" ? "No completed tasks yet." : filter === "today" ? "Nothing scheduled for today." : "You have no tasks yet."}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Your roadmap becomes real when you turn it into actions.</p><Button className="mt-6" onClick={openCreate}><Plus size={17} />Create your first task</Button></div>}</section>
      {modal ? <TaskForm initial={formFromTask(editingTask)} roadmapWeeks={data.roadmapWeeks} editing={modal === "edit"} pending={pending} error={error} onSubmit={saveTask} onClose={() => setModal(null)} /> : null}
      {confirmDelete ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,26,51,0.5)] p-5" role="presentation"><div className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)]" role="dialog" aria-modal="true" aria-labelledby="delete-task-title"><h2 id="delete-task-title" className="text-xl font-semibold">Delete this task?</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">“{confirmDelete.title}” and its associated completion records may be removed according to the database relationship.</p><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button type="button" variant="danger" onClick={deleteTask} disabled={pending}>Delete task</Button></div></div></div> : null}
    </div>
  );
}
