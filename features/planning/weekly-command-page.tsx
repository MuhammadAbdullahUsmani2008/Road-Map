"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock3,
  Edit3,
  ExternalLink,
  FastForward,
  FileText,
  Layers,
  Map,
  Plus,
  RefreshCcw,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTaskAction, deleteTaskAction, reopenTaskAction, updateTaskAction } from "@/app/actions/task-actions";
import {
  carryForwardTasksAction,
  saveWeekObjectiveAction,
  saveWeeklyReviewAction,
  toggleWeeklyMilestoneAction,
} from "@/app/actions/planning-actions";
import { CompletionIndicator, ProgressBar } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type {
  WeeklyCommandData,
  WeeklyMilestoneItem,
  WeeklyTaskItem,
} from "@/features/planning/weekly-command-data";
import type { TodayTrack } from "@/features/today/today-helpers";

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function priorityLabel(priority: number) {
  if (priority <= 2) return { label: "High", tone: "danger" as const };
  if (priority === 3) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

function trackTone(track: TodayTrack) {
  if (track === "E-Commerce") return "primary" as const;
  if (track === "YouTube Automation") return "violet" as const;
  return "neutral" as const;
}

function weekStatusTone(status: string) {
  if (status === "active") return "primary" as const;
  if (status === "completed") return "success" as const;
  if (status === "archived") return "neutral" as const;
  return "warning" as const;
}

// Objective Edit Modal
function ObjectiveModal({
  initial,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  initial: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (val: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="objective-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="violet">Weekly Objective</Badge>
            <h2 id="objective-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">What outcome makes this week count?</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close objective modal"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
          <label className="block text-sm font-semibold">
            Objective
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="e.g. Launch the first advertising campaign and begin YouTube automation pipeline."
              maxLength={500}
            />
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save objective"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Weekly Review Modal
function ReviewModal({
  initial,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  initial: { summary: string; lessons: string; nextFocus: string };
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: { summary: string; lessons: string; nextFocus: string }) => void;
}) {
  const [form, setForm] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="violet">Weekly Review</Badge>
            <h2 id="review-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Close out the week with evidence</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close review modal"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            Weekly Summary (what was actually produced)
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What tangible progress happened across tracks?"
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Lessons Learned & Corrections
            <textarea
              value={form.lessons}
              onChange={(e) => setForm({ ...form, lessons: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What friction arose, and what directly changes in next week's execution?"
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Next Week Focus (the primary outcome to carry forward)
            <textarea
              value={form.nextFocus}
              onChange={(e) => setForm({ ...form, nextFocus: e.target.value })}
              className="mt-2 min-h-20 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="The one essential standard to protect next week."
              maxLength={2000}
            />
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Weekly Review"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Carry Forward Modal
function CarryForwardModal({
  incompleteTasks,
  upcomingWeeks,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  incompleteTasks: WeeklyTaskItem[];
  upcomingWeeks: Array<{ id: string; label: string; weekStart: string }>;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (taskIds: string[], targetWeekId: string, mode: "reschedule" | "copy") => void;
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(incompleteTasks.map((t) => t.id));
  const [targetWeekId, setTargetWeekId] = useState<string>(upcomingWeeks[0]?.id ?? "");
  const [mode, setMode] = useState<"reschedule" | "copy">("reschedule");

  function toggleTask(id: string) {
    setSelectedTaskIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="carry-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="warning">Explicit Carry-Forward</Badge>
            <h2 id="carry-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Carry unfinished work into next week</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close carry forward modal"><X size={19} /></IconButton>
        </div>

        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Tasks are never automatically moved. You explicitly choose which tasks carry forward, their target week, and whether to reschedule or copy.
        </p>

        {upcomingWeeks.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--line-strong)] p-6 text-center">
            <p className="text-sm font-semibold">No future weeks planned yet.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Create the next week using Week Builder before carrying tasks forward.</p>
            <Link href="/planning/week/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white">
              <Plus size={14} />Create Next Week
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(selectedTaskIds, targetWeekId, mode); }}>
            <label className="block text-sm font-semibold">
              Target planned week
              <select
                value={targetWeekId}
                onChange={(e) => setTargetWeekId(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
                required
              >
                {upcomingWeeks.map((w) => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Carry mode</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("reschedule")}
                  className={`rounded-lg p-2.5 text-left border transition ${mode === "reschedule" ? "border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
                >
                  <span className="block font-bold">Reschedule</span>
                  <span className="block text-[11px] font-normal text-[var(--muted)]">Moves task into target week</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("copy")}
                  className={`rounded-lg p-2.5 text-left border transition ${mode === "copy" ? "border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
                >
                  <span className="block font-bold">Copy / Duplicate</span>
                  <span className="block text-[11px] font-normal text-[var(--muted)]">Keeps original record intact</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">Select tasks to carry forward ({selectedTaskIds.length} of {incompleteTasks.length})</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
                {incompleteTasks.map((task) => (
                  <label key={task.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--surface-muted)] cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => toggleTask(task.id)}
                      className="h-4 w-4 rounded accent-[var(--primary)]"
                    />
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge tone={trackTone(task.track)}>{task.track.split(" ")[0]}</Badge>
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={pending || selectedTaskIds.length === 0}>
                {pending ? "Applying..." : mode === "reschedule" ? "Reschedule Selected Tasks" : "Copy Selected Tasks"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Edit Task Modal
function EditTaskModal({
  task,
  pending,
  error,
  onClose,
  onSubmit,
  onDelete,
}: {
  task: WeeklyTaskItem;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (taskId: string, form: { title: string; description: string; track: TodayTrack; priority: string; dueOn: string; estimatedMinutes: string }) => void;
  onDelete: (taskId: string) => void;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    track: task.track,
    priority: String(task.priority),
    dueOn: task.dueOn ?? "",
    estimatedMinutes: task.estimatedMinutes ? String(task.estimatedMinutes) : "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="edit-task-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="primary">Edit Task</Badge>
            <h2 id="edit-task-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Refine task details</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close edit task modal"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(task.id, form); }}>
          <label className="block text-sm font-semibold">
            Task title<span className="ml-1 text-[var(--danger)]">*</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              required
              maxLength={160}
            />
          </label>
          <label className="block text-sm font-semibold">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-2 min-h-20 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              maxLength={1000}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Track
              <select
                value={form.track}
                onChange={(e) => setForm({ ...form, track: e.target.value as TodayTrack })}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
              >
                <option value="E-Commerce">E-Commerce</option>
                <option value="YouTube Automation">YouTube Automation</option>
                <option value="Operating System">Operating System</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Priority
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
              >
                <option value="1">High (P1)</option>
                <option value="3">Medium (P3)</option>
                <option value="5">Low (P5)</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Due date
              <input
                type="date"
                value={form.dueOn}
                onChange={(e) => setForm({ ...form, dueOn: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
              />
            </label>
            <label className="block text-sm font-semibold">
              Est. minutes
              <input
                type="number"
                min="1"
                max="1440"
                value={form.estimatedMinutes}
                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
              />
            </label>
          </div>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onDelete(task.id)} className="text-[var(--danger)] hover:bg-[var(--danger-tint)]">
              Delete task
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save changes"}<Check size={16} /></Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// MAIN PAGE COMPONENT
export function WeeklyCommandPage({ data }: { data: WeeklyCommandData }) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<"All" | TodayTrack>("All");
  const [localTasks, setLocalTasks] = useState<WeeklyTaskItem[]>(data.tasks);
  const [localMilestones, setLocalMilestones] = useState<WeeklyMilestoneItem[]>(data.milestones);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Modals
  const [modal, setModal] = useState<"objective" | "review" | "carry" | null>(null);
  const [editingTask, setEditingTask] = useState<WeeklyTaskItem | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Dynamic counts
  const completedCount = localTasks.filter((t) => t.completedInWeek).length;
  const plannedCount = localTasks.length;
  const remainingCount = plannedCount - completedCount;
  const overdueCount = localTasks.filter((t) => t.isOverdue).length;
  const completionPercent = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;
  const incompleteTasks = localTasks.filter((t) => !t.completedInWeek);

  // Filtered task board
  const filteredTasks = useMemo(() => {
    if (selectedTrack === "All") return localTasks;
    return localTasks.filter((t) => t.track === selectedTrack);
  }, [localTasks, selectedTrack]);

  const displayedPending = filteredTasks.filter((t) => !t.completedInWeek);
  const displayedCompleted = filteredTasks.filter((t) => t.completedInWeek);

  // Actions
  function toggleTask(task: WeeklyTaskItem) {
    const complete = !task.completedInWeek;
    setError(null);
    setLocalTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, completedInWeek: complete, status: complete ? "completed" : "planned" } : t))
    );
    startTransition(async () => {
      const result = complete ? await completeTaskAction(task.id) : await reopenTaskAction(task.id);
      if (!result.ok) {
        setLocalTasks((current) => current.map((t) => (t.id === task.id ? task : t)));
        setError(result.error);
      } else {
        setSuccess(complete ? `Completed: "${task.title}"` : `Reopened: "${task.title}"`);
        router.refresh();
      }
    });
  }

  function toggleMilestone(milestone: WeeklyMilestoneItem) {
    const achieved = milestone.status !== "achieved";
    setError(null);
    setLocalMilestones((current) =>
      current.map((m) => (m.id === milestone.id ? { ...m, status: achieved ? "achieved" : "planned", achievedOn: achieved ? data.today : null } : m))
    );
    startTransition(async () => {
      const result = await toggleWeeklyMilestoneAction(milestone.id, achieved);
      if (!result.ok) {
        setLocalMilestones((current) => current.map((m) => (m.id === milestone.id ? milestone : m)));
        setError(result.error);
      } else {
        setSuccess(achieved ? `Achieved milestone: "${milestone.title}"` : `Reopened milestone: "${milestone.title}"`);
        router.refresh();
      }
    });
  }

  function saveObjective(objective: string) {
    if (!data.week) return;
    setError(null);
    startTransition(async () => {
      const result = await saveWeekObjectiveAction({ weekId: data.week!.id, objective });
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess("Weekly objective updated.");
      router.refresh();
    });
  }

  function saveReview(form: { summary: string; lessons: string; nextFocus: string }) {
    if (!data.week) return;
    setError(null);
    startTransition(async () => {
      const result = await saveWeeklyReviewAction({ weekStart: data.week!.weekStart, ...form });
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess("Weekly review saved.");
      router.refresh();
    });
  }

  function handleCarryForward(taskIds: string[], targetWeekId: string, mode: "reschedule" | "copy") {
    setError(null);
    startTransition(async () => {
      const result = await carryForwardTasksAction({ taskIds, targetWeekId, mode });
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess(`${taskIds.length} task${taskIds.length === 1 ? "" : "s"} ${mode === "reschedule" ? "rescheduled" : "copied"} to next week.`);
      router.refresh();
    });
  }

  function saveEditedTask(taskId: string, form: { title: string; description: string; track: TodayTrack; priority: string; dueOn: string; estimatedMinutes: string }) {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction(taskId, {
        title: form.title,
        description: form.description || undefined,
        track: form.track,
        priority: Number(form.priority),
        dueOn: form.dueOn || undefined,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      });
      if (!result.ok) { setError(result.error); return; }
      setEditingTask(null);
      setSuccess("Task updated.");
      router.refresh();
    });
  }

  function deleteTask(taskId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(taskId);
      if (!result.ok) { setError(result.error); return; }
      setEditingTask(null);
      setLocalTasks((current) => current.filter((t) => t.id !== taskId));
      setSuccess("Task deleted.");
      router.refresh();
    });
  }

  function navigateToWeek(id: string) {
    router.push(`/planning/week?week=${id}`);
  }

  if (!data.authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12">
        <Badge tone="primary">Weekly Command Center</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to access your weekly command center.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your weekly planning and execution data is private to your authenticated workspace.</p>
      </div>
    );
  }

  if (!data.week) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
          <CalendarDays className="mx-auto text-[var(--muted)]" size={36} />
          <h2 className="mt-4 text-2xl font-bold">No roadmap weeks found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            Create your first week in the Roadmap or Week Builder to activate the Weekly Command Center.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/planning/week/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white">
              <Plus size={16} />Plan First Week
            </Link>
            <Link href="/roadmap" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold">
              Open Roadmap <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* STEP 8: PLANNING -> EXECUTION -> REVIEW LOOP NAVIGATOR */}
      <nav aria-label="Execution loop stages" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold">
          <span className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-white">
            <CalendarRange size={13} />1. Weekly Plan
          </span>
          <span className="text-[var(--muted)]">→</span>
          <Link href="/today" className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition">
            <Zap size={13} />2. Daily Execution
          </Link>
          <span className="text-[var(--muted)]">→</span>
          <Link href="/today" className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition">
            <CalendarCheck size={13} />3. Daily Reports
          </Link>
          <span className="text-[var(--muted)]">→</span>
          <a href="#timeline-heading" className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition">
            <Clock3 size={13} />4. Weekly Results
          </a>
          <span className="text-[var(--muted)]">→</span>
          <a href="#review-heading" className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] transition">
            <FileText size={13} />5. Weekly Review
          </a>
          <span className="text-[var(--muted)]">→</span>
          <Link href="/planning/week/new" className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[var(--violet)] bg-[var(--violet-tint)] hover:opacity-85 transition">
            <Plus size={13} />6. Next Week
          </Link>
        </div>
      </nav>

      {/* STEP 2 & 11: WEEKLY COMMAND CENTER HEADER */}
      <header className="mt-6 flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet" dot>Weekly Command Center</Badge>
            <Badge tone={weekStatusTone(data.week.status)}>{data.week.status}</Badge>
            {data.roadmap?.monthTitle ? (
              <span className="text-xs text-[var(--muted)] font-medium">
                {data.roadmap.monthTitle} {data.roadmap.year ? `· Year ${data.roadmap.year}` : ""}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-[var(--ink)]">
            Week of {data.week.weekStart}
            <span className="ml-2 text-xl font-normal text-[var(--muted)] sm:text-2xl">
              ({data.week.weekStart} → {data.week.weekEnd})
            </span>
          </h1>

          {/* Week Objective with edit button */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="max-w-3xl text-sm leading-6 text-[var(--ink-soft)] font-medium">
              <span className="font-bold text-[var(--ink)]">Objective: </span>
              {data.week.objective || "No objective defined yet. Define a clear outcome for this week."}
            </p>
            <button
              type="button"
              onClick={() => setModal("objective")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              <Edit3 size={13} />{data.week.objective ? "Edit Objective" : "Set Objective"}
            </button>
          </div>
        </div>

        {/* STEP 11: Week Switcher Navigation */}
        <div className="flex flex-wrap items-center gap-2 lg:self-end">
          <IconButton
            onClick={() => data.previousWeekId && navigateToWeek(data.previousWeekId)}
            disabled={!data.previousWeekId}
            aria-label="Previous week"
            title="Previous planned week"
          >
            <ChevronLeft size={18} />
          </IconButton>

          <select
            value={data.week.id}
            onChange={(e) => navigateToWeek(e.target.value)}
            className="min-h-10 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-xs font-semibold outline-none focus:border-[var(--primary)]"
            aria-label="Select week to inspect"
          >
            {data.allWeeks.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>

          <IconButton
            onClick={() => data.nextWeekId && navigateToWeek(data.nextWeekId)}
            disabled={!data.nextWeekId}
            aria-label="Next week"
            title="Next planned week"
          >
            <ChevronRight size={18} />
          </IconButton>

          <Link
            href="/planning/week/new"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)] transition"
          >
            <Plus size={14} />Plan Week
          </Link>
          <Link
            href="/intelligence?period=current-week"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)]"
            title="Open Intelligence Center for this week"
          >
            <Brain size={14} />Intelligence
          </Link>
        </div>
      </header>

      {/* Notifications */}
      {error ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert">
          <div className="flex items-center gap-2"><CircleAlert size={17} />{error}</div>
          <IconButton onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></IconButton>
        </div>
      ) : null}
      {success ? (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[var(--success-tint)] p-4 text-sm text-[var(--success)]" role="status">
          <div className="flex items-center gap-2"><Check size={17} />{success}</div>
          <IconButton onClick={() => setSuccess(null)} aria-label="Dismiss message"><X size={15} /></IconButton>
        </div>
      ) : null}

      {/* WEEKLY KPI SUMMARY STRIP */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" aria-label="Weekly execution KPIs">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Planned</p>
          <p className="mt-1 text-2xl font-bold">{plannedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Completed</p>
          <p className="mt-1 text-2xl font-bold text-[var(--success)]">{completedCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Remaining</p>
          <p className="mt-1 text-2xl font-bold">{remainingCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Overdue</p>
          <p className={`mt-1 text-2xl font-bold ${overdueCount > 0 ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>{overdueCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Progress</p>
          <p className="mt-1 text-2xl font-bold">{completionPercent}%</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Focus Time</p>
          <p className="mt-1 text-2xl font-bold">{formatMinutes(data.totalFocusedMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center col-span-2 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Review</p>
          <p className="mt-1 text-xs font-bold sm:text-sm">
            <span className={`inline-block rounded-md px-2 py-1 ${data.review?.isReviewed ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--warning-tint)] text-[var(--warning)]"}`}>
              {data.review?.isReviewed ? "Reviewed" : "Pending"}
            </span>
          </p>
        </div>
      </section>

      {/* OVERDUE / UNFINISHED WORK ACTION (STEP 9: EXPLICIT CARRY-FORWARD) */}
      {incompleteTasks.length > 0 ? (
        <section className="mt-6 flex flex-col justify-between gap-4 rounded-3xl border border-[var(--warning-soft)] bg-[var(--warning-tint)]/40 p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="warning">Actionable Floor</Badge>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Unfinished Tasks</span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">
              {incompleteTasks.length} task{incompleteTasks.length === 1 ? "" : "s"} remain open in this week
            </h3>
            <p className="text-xs text-[var(--ink-soft)]">
              Carry unfinished work into the next week with an explicit user decision. Tasks are never automatically altered.
            </p>
          </div>
          <Button type="button" onClick={() => setModal("carry")} className="shrink-0 gap-1.5">
            <FastForward size={16} />Carry Forward Tasks
          </Button>
        </section>
      ) : null}

      {/* STEP 5: TRACK BREAKDOWN */}
      <section className="mt-8" aria-labelledby="track-breakdown-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
              <Layers size={14} />Execution By Track
            </p>
            <h2 id="track-breakdown-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Business Tracks</h2>
          </div>
          <span className="text-xs text-[var(--muted)]">Click a track to filter task board</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {data.tracks.map((ts) => {
            const isSelected = selectedTrack === ts.track;
            return (
              <div
                key={ts.track}
                onClick={() => setSelectedTrack(isSelected ? "All" : ts.track)}
                className={`cursor-pointer rounded-3xl border p-5 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] ${isSelected ? "border-[var(--primary)] bg-[var(--primary-tint)]/25" : "border-[var(--line)] bg-[var(--surface)]"}`}
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${ts.track}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={trackTone(ts.track)}>{ts.track}</Badge>
                  <span className="text-xs font-bold text-[var(--ink)]">{ts.completionPercent}%</span>
                </div>
                <h3 className="mt-3 text-lg font-bold tracking-tight text-[var(--ink)]">{ts.track}</h3>
                <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                  <div className="rounded-xl bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Plan</span>
                    <span className="font-bold">{ts.planned}</span>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Done</span>
                    <span className="font-bold text-[var(--success)]">{ts.completed}</span>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Left</span>
                    <span className="font-bold">{ts.remaining}</span>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Over</span>
                    <span className={`font-bold ${ts.overdue > 0 ? "text-[var(--danger)]" : ""}`}>{ts.overdue}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={ts.completionPercent} label={`${ts.completed} of ${ts.planned} complete`} tone={trackTone(ts.track)} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STEP 4: DAILY EXECUTION TIMELINE (MONDAY -> SUNDAY) */}
      <section className="mt-8" aria-labelledby="timeline-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
              <CalendarDays size={14} />Daily Execution Timeline
            </p>
            <h2 id="timeline-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Monday → Sunday Breakdown</h2>
          </div>
          <span className="text-xs text-[var(--muted)]">7 days of real signal</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {data.days.map((day) => {
            const isExpanded = expandedDay === day.date;
            return (
              <div
                key={day.date}
                className={`rounded-2xl border p-4 transition shadow-sm ${day.isToday ? "border-2 border-[var(--primary)] bg-[var(--primary-tint)]/15" : "border-[var(--line)] bg-[var(--surface)]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{day.dayName.slice(0, 3)}</span>
                  {day.isToday ? <Badge tone="primary">Today</Badge> : <span className="text-[11px] text-[var(--muted)]">{day.shortDate}</span>}
                </div>

                <div className="mt-3">
                  <p className="text-lg font-bold text-[var(--ink)]">
                    {day.completedCount} <span className="text-xs font-normal text-[var(--muted)]">/ {day.plannedCount} done</span>
                  </p>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
                  <p className="flex items-center justify-between">
                    <span>Focus:</span>
                    <span className="font-semibold text-[var(--ink)]">{day.focusedMinutes > 0 ? `${day.focusedMinutes}m` : "—"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Report:</span>
                    {day.dailyReport ? (
                      <span className="font-semibold text-[var(--success)]">Logged ({day.dailyReport.energy ? `${day.dailyReport.energy}/10` : "✓"})</span>
                    ) : (
                      <span className="text-[var(--muted)]">None</span>
                    )}
                  </p>
                </div>

                {day.tasks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    className="mt-3 flex w-full items-center justify-between pt-2 border-t border-[var(--line)] text-[11px] font-semibold text-[var(--primary)] hover:underline"
                  >
                    <span>{day.tasks.length} task{day.tasks.length === 1 ? "" : "s"}</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : null}

                {isExpanded ? (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-[var(--line)] text-left">
                    {day.tasks.map((t) => (
                      <p key={t.id} className={`text-[11px] truncate ${t.completed ? "text-[var(--muted)] line-through" : "text-[var(--ink)] font-medium"}`}>
                        • {t.title}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* STEP 3: WEEK-AT-A-GLANCE TASK BOARD */}
      <section className="mt-8" aria-labelledby="tasks-heading">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Week-at-a-Glance</p>
            <h2 id="tasks-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
              Tasks ({filteredTasks.length})
            </h2>
          </div>

          {/* Track Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
            <button
              type="button"
              onClick={() => setSelectedTrack("All")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectedTrack === "All" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              All ({localTasks.length})
            </button>
            {data.tracks.map((ts) => (
              <button
                key={ts.track}
                type="button"
                onClick={() => setSelectedTrack(ts.track)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectedTrack === ts.track ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              >
                {ts.track.split(" ")[0]} ({ts.planned})
              </button>
            ))}
          </div>
        </div>

        {/* Incomplete Tasks */}
        {displayedPending.length > 0 ? (
          <div className="space-y-3">
            {displayedPending.map((task) => {
              const priority = priorityLabel(task.priority);
              return (
                <article
                  key={task.id}
                  className={`flex flex-col gap-4 rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] sm:flex-row sm:items-center ${task.isOverdue ? "border-[var(--danger-soft)]" : "border-[var(--line)]"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task)}
                    disabled={pending}
                    aria-label={`Complete ${task.title}`}
                    className="self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-center"
                  >
                    <CompletionIndicator complete={false} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={trackTone(task.track)}>{task.track}</Badge>
                      <Badge tone={priority.tone}>{priority.label}</Badge>
                      {task.isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
                    </div>

                    <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">{task.title}</h3>
                    {task.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{task.description}</p> : null}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                      {task.dueOn ? (
                        <span className={`inline-flex items-center gap-1 ${task.isOverdue ? "font-bold text-[var(--danger)]" : ""}`}>
                          <CalendarDays size={13} />Due {task.dueOn}
                        </span>
                      ) : null}
                      {task.scheduledFor ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={13} />Scheduled {task.scheduledFor}
                        </span>
                      ) : null}
                      {task.estimatedMinutes ? <span>{formatMinutes(task.estimatedMinutes)}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Link
                      href={`/focus?task=${task.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                      title="Start Focus"
                    >
                      <Zap size={15} />Focus
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingTask(task)}
                      className="min-h-10 px-3 text-xs"
                      title="Edit task"
                    >
                      <Edit3 size={15} />Edit
                    </Button>
                    <Link
                      href={`/tasks?task=${task.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)]"
                      title="Details"
                    >
                      <RefreshCcw size={15} />Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
            <p className="text-base font-semibold">No tasks found for {selectedTrack === "All" ? "this week" : selectedTrack}.</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Assign tasks to this roadmap week from the Tasks page or Week Builder.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/tasks" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-xs font-semibold text-white">
                <Plus size={15} />Create or Link Tasks
              </Link>
            </div>
          </div>
        ) : null}

        {/* Completed Tasks in Week */}
        {displayedCompleted.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <CheckCircle2 size={16} className="text-[var(--success)]" />
                Completed in Week ({displayedCompleted.length})
                {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showCompleted ? (
              <div className="space-y-2.5">
                {displayedCompleted.map((task) => (
                  <article
                    key={task.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4 opacity-80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        disabled={pending}
                        aria-label={`Reopen ${task.title}`}
                        className="mt-0.5 self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        <CompletionIndicator complete={true} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={trackTone(task.track)}>{task.track}</Badge>
                          <Badge tone="success">Completed</Badge>
                        </div>
                        <h4 className="mt-1 text-sm font-semibold text-[var(--muted)] line-through">{task.title}</h4>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => toggleTask(task)}
                      className="text-xs min-h-8 px-2.5"
                    >
                      Reopen
                    </Button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* STEP 6: WEEKLY MILESTONES */}
      {localMilestones.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm" aria-labelledby="milestones-heading">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--warning-tint)] text-[var(--warning)]">
                <Trophy size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--warning)]">Weekly Milestones</p>
                <h3 id="milestones-heading" className="text-xl font-bold tracking-tight">Milestones Due This Week ({localMilestones.length})</h3>
              </div>
            </div>
            <Link href="/youtube/milestones" className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
              Milestones Center <ExternalLink size={13} />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {localMilestones.map((m) => {
              const achieved = m.status === "achieved";
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] p-4 bg-[var(--surface)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {m.track ? <Badge tone="neutral">{m.track}</Badge> : null}
                      <Badge tone={achieved ? "success" : "warning"}>{achieved ? "Achieved" : "Due This Week"}</Badge>
                    </div>
                    <h4 className={`mt-2 text-sm font-semibold ${achieved ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"}`}>{m.title}</h4>
                    {m.dueOn ? <p className="mt-1 text-xs text-[var(--muted)]">Target: {m.dueOn}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant={achieved ? "secondary" : "primary"}
                    onClick={() => toggleMilestone(m)}
                    className="text-xs min-h-9 px-3 shrink-0"
                  >
                    {achieved ? "Reopen" : "Mark Achieved"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* STEP 7: WEEKLY REVIEW CHECKOUT */}
      <section id="review-heading" className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="review-section-title">
        <div className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={data.review?.isReviewed ? "success" : "violet"}>
                {data.review?.isReviewed ? "Review Complete" : "Weekly Review Pending"}
              </Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Close Out the Week</span>
            </div>
            <h2 id="review-section-title" className="mt-2 text-2xl font-bold tracking-tight">
              Weekly Review & Reflection
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Evaluate real execution evidence before carrying lessons into next week&apos;s planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setModal("review")} className="min-h-11">
              <FileText size={16} />{data.review?.isReviewed ? "Edit Weekly Review" : "Complete Weekly Review"}
            </Button>
            <Link
              href="/reports/weekly"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)]"
            >
              Weekly Reports Archive <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Review Highlights */}
        {data.review?.isReviewed ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Summary & Output</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{data.review.summary || "No summary recorded."}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Lessons & Corrections</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{data.review.lessons || "No lessons recorded."}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Next Week&apos;s Main Focus</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{data.review.nextFocus || "No focus recorded."}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-[var(--line-strong)] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Weekly review has not been completed yet.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Record what went well, what got blocked, and what standard to enforce for the next week.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setModal("review")} className="shrink-0">
              <FileText size={16} />Write Weekly Review
            </Button>
          </div>
        )}
      </section>

      {/* ROADMAP ALIGNMENT FOOTER */}
      {data.roadmap?.monthTitle ? (
        <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--violet-tint)]/30 p-6 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--violet)]">
                <Map size={14} />Roadmap Context
              </p>
              <h3 className="mt-1 text-lg font-bold">
                {data.roadmap.goalTitle ?? "Primary Goal"} → Year {data.roadmap.year} → {data.roadmap.phaseTitle} → {data.roadmap.monthTitle}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/roadmap" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-xs font-semibold">
                Open Roadmap <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* MODALS */}
      {modal === "objective" ? (
        <ObjectiveModal
          initial={data.week.objective ?? ""}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={saveObjective}
        />
      ) : null}

      {modal === "review" ? (
        <ReviewModal
          initial={{
            summary: data.review?.summary ?? "",
            lessons: data.review?.lessons ?? "",
            nextFocus: data.review?.nextFocus ?? "",
          }}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={saveReview}
        />
      ) : null}

      {modal === "carry" ? (
        <CarryForwardModal
          incompleteTasks={incompleteTasks}
          upcomingWeeks={data.upcomingWeeks}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={handleCarryForward}
        />
      ) : null}

      {editingTask ? (
        <EditTaskModal
          task={editingTask}
          pending={pending}
          error={error}
          onClose={() => setEditingTask(null)}
          onSubmit={saveEditedTask}
          onDelete={deleteTask}
        />
      ) : null}
    </div>
  );
}
