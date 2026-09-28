"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Edit3,
  FileText,
  Flame,
  Layers,
  Map,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Square,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { completeTaskAction, createTaskAction, deleteTaskAction, reopenTaskAction, updateTaskAction } from "@/app/actions/task-actions";
import { pauseFocusAction, resumeFocusAction, stopFocusAction } from "@/app/actions/focus-actions";
import { saveDailyReportAction, saveWeeklyReviewAction } from "@/app/actions/today-actions";
import { EmptyState } from "@/components/feedback/feedback-patterns";
import { CompletionIndicator, ProgressBar, ProgressRing, StreakIndicator } from "@/components/progress/progress-visuals";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { ActiveFocusSession, TodayData } from "@/features/today/today-data";
import {
  getDoThisNextTask,
  type TodayTask,
  type TodayTrack,
} from "./today-helpers";

type TaskFormState = {
  title: string;
  description: string;
  track: TodayTrack;
  priority: string;
  dueOn: string;
  scheduledFor: string;
  estimatedMinutes: string;
  roadmapWeekId: string;
};

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${hours > 0 ? `${hours}:` : ""}${minutes}:${seconds}`;
}

function priorityLabel(priority: number) {
  if (priority <= 2) return { label: "High", tone: "danger" as const };
  if (priority === 3) return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

function trackBadgeTone(track: TodayTrack) {
  if (track === "E-Commerce") return "primary" as const;
  if (track === "YouTube Automation") return "violet" as const;
  return "neutral" as const;
}

const dailyStateCopy = {
  NOT_STARTED: { label: "Not started", tone: "neutral" as const, message: "Today is ready. Pick your first action to establish momentum." },
  IN_PROGRESS: { label: "In progress", tone: "primary" as const, message: "Execution in motion. Keep the next action visible." },
  MINIMUM_ACHIEVED: { label: "Floor protected", tone: "success" as const, message: "Today's daily minimum is satisfied. Build momentum or prepare closeout." },
  DAY_COMPLETED: { label: "Day completed", tone: "success" as const, message: "Execution completed and daily report logged. Clean shutdown achieved." },
};

function QuickAddForm({
  today,
  roadmapWeeks,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  today: string;
  roadmapWeeks: TodayData["roadmapWeeks"];
  pending: boolean;
  error: string | null;
  onSubmit: (form: TaskFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TaskFormState>({
    title: "",
    description: "",
    track: "E-Commerce",
    priority: "3",
    dueOn: today,
    scheduledFor: today,
    estimatedMinutes: "30",
    roadmapWeekId: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="primary">Quick Add</Badge>
            <h2 id="quick-add-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Add today&apos;s action</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close quick add"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            Task title<span className="ml-1 text-[var(--danger)]">*</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="e.g. Test video ad creatives for campaign"
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
              placeholder="What specific outcome completes this task?"
              maxLength={1000}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Business track
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              Scheduled
              <input
                type="date"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
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
                placeholder="30"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Roadmap week link
            <select
              value={form.roadmapWeekId}
              onChange={(e) => setForm({ ...form, roadmapWeekId: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
            >
              <option value="">No roadmap link</option>
              {roadmapWeeks.map((week) => (
                <option key={week.id} value={week.id}>{week.label}</option>
              ))}
            </select>
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create task"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTaskForm({
  task,
  roadmapWeeks,
  pending,
  error,
  onClose,
  onSubmit,
  onDelete,
}: {
  task: TodayTask;
  roadmapWeeks: TodayData["roadmapWeeks"];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (taskId: string, form: TaskFormState) => void;
  onDelete: (taskId: string) => void;
}) {
  const [form, setForm] = useState<TaskFormState>({
    title: task.title,
    description: task.description ?? "",
    track: task.track,
    priority: String(task.priority),
    dueOn: task.dueOn ?? "",
    scheduledFor: task.scheduledFor ?? "",
    estimatedMinutes: task.estimatedMinutes ? String(task.estimatedMinutes) : "",
    roadmapWeekId: task.roadmapWeekId ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="edit-task-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="primary">Edit Task</Badge>
            <h2 id="edit-task-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Refine task details</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close edit task"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(task.id, form); }}>
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
              placeholder="Clarify done conditions"
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              Scheduled
              <input
                type="date"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
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
          <label className="block text-sm font-semibold">
            Roadmap week link
            <select
              value={form.roadmapWeekId}
              onChange={(e) => setForm({ ...form, roadmapWeekId: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
            >
              <option value="">No roadmap link</option>
              {roadmapWeeks.map((week) => (
                <option key={week.id} value={week.id}>{week.label}</option>
              ))}
            </select>
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onDelete(task.id)} className="text-[var(--danger)] hover:bg-[var(--danger-tint)]">
              <Trash2 size={16} />Delete task
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

function ReportForm({
  report,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  report: TodayData["report"];
  pending: boolean;
  error: string | null;
  onSubmit: (form: { wins: string; blockers: string; energy: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    wins: report?.wins ?? "",
    blockers: report?.blockers ?? "",
    energy: report?.energy ? String(report.energy) : "7",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="primary">{report ? "Edit Daily Report" : "Daily Checkout Report"}</Badge>
            <h2 id="report-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{report ? "Update today's record" : "Close out today's execution"}</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close report form"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            What went well / completed work
            <textarea
              value={form.wins}
              onChange={(e) => setForm({ ...form, wins: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="Concrete work delivered today across business tracks."
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Blockers / friction encountered
            <textarea
              value={form.blockers}
              onChange={(e) => setForm({ ...form, blockers: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What created delay, was deferred, or needs adjustment tomorrow?"
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Energy level (1–10)
            <input
              type="number"
              min="1"
              max="10"
              value={form.energy}
              onChange={(e) => setForm({ ...form, energy: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="7"
            />
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : report ? "Save report changes" : "Submit daily report"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewForm({
  review,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  review: TodayData["weeklyReview"];
  pending: boolean;
  error: string | null;
  onSubmit: (form: { summary: string; lessons: string; nextFocus: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    summary: review?.summary ?? "",
    lessons: review?.lessons ?? "",
    nextFocus: review?.nextFocus ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="violet">{review ? "Edit Weekly Review" : "Weekly Review"}</Badge>
            <h2 id="review-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{review ? "Refine weekly review" : "Close out the week"}</h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close review form"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            Weekly summary
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What this week actually produced."
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Lessons & corrections
            <textarea
              value={form.lessons}
              onChange={(e) => setForm({ ...form, lessons: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What you learned that directly changes next week's plan."
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Next week&apos;s main focus
            <textarea
              value={form.nextFocus}
              onChange={(e) => setForm({ ...form, nextFocus: e.target.value })}
              className="mt-2 min-h-20 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="The primary outcome to carry forward."
              maxLength={2000}
            />
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : review ? "Save review" : "Submit weekly review"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TodayPage({ data }: { data: TodayData }) {
  const router = useRouter();
  const [modal, setModal] = useState<"add" | "report" | "review" | null>(null);
  const [editingTask, setEditingTask] = useState<TodayTask | null>(null);
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [localTasks, setLocalTasks] = useState<TodayTask[]>(data.tasks);
  const [localOverdueTasks, setLocalOverdueTasks] = useState<TodayTask[]>(data.overdueTasks);
  const [activeFocus, setActiveFocus] = useState<ActiveFocusSession | null>(data.activeFocusSession);
  const [selectedTrack, setSelectedTrack] = useState<"All" | TodayTrack>("All");
  const [showOverdueSection, setShowOverdueSection] = useState(true);
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  // Live timer for active focus session
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeFocus || activeFocus.status !== "active") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeFocus]);

  const activeFocusSeconds = useMemo(() => {
    if (!activeFocus) return 0;
    const running = activeFocus.status === "active" && activeFocus.activeStartedAt
      ? Math.max(0, Math.floor((now - new Date(activeFocus.activeStartedAt).getTime()) / 1000))
      : 0;
    return activeFocus.durationSeconds + running;
  }, [activeFocus, now]);

  // Derived counts and state
  const completedCount = localTasks.filter((task) => task.completedToday).length;
  const plannedCount = localTasks.length;
  const remainingCount = localTasks.filter((task) => !task.completedToday).length;
  const percent = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0;
  const completedMinutes = localTasks.filter((task) => task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const remainingMinutes = localTasks.filter((task) => !task.completedToday).reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  const minimumMet = completedCount >= data.dailyMinimumTasks;
  const copy = dailyStateCopy[minimumMet ? (data.report ? "DAY_COMPLETED" : "MINIMUM_ACHIEVED") : completedCount > 0 ? "IN_PROGRESS" : "NOT_STARTED"];

  // Real-time track summary
  const tracks: TodayTrack[] = ["E-Commerce", "YouTube Automation", "Operating System"];
  const trackSummaries = tracks.map((track) => {
    const trackTasks = localTasks.filter((t) => t.track === track);
    const planned = trackTasks.length;
    const completed = trackTasks.filter((t) => t.completedToday).length;
    const remaining = planned - completed;
    return { track, planned, completed, remaining };
  });

  // "Do This Next" task
  const doThisNext = useMemo(() => {
    return getDoThisNextTask(localTasks, localOverdueTasks, data.today);
  }, [localTasks, localOverdueTasks, data.today]);

  // Track filtering
  const visibleTasks = useMemo(() => {
    if (selectedTrack === "All") return localTasks;
    return localTasks.filter((task) => task.track === selectedTrack);
  }, [localTasks, selectedTrack]);

  const incompleteTasks = visibleTasks.filter((task) => !task.completedToday);
  const completedTasks = visibleTasks.filter((task) => task.completedToday);

  // Actions
  function toggleTask(task: TodayTask) {
    const complete = !task.completedToday;
    setError(null);
    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, completedToday: complete, status: complete ? "completed" : "planned" } : item))
    );
    startTransition(async () => {
      const result = complete ? await completeTaskAction(task.id) : await reopenTaskAction(task.id);
      if (!result.ok) {
        setLocalTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
        setError(result.error);
      } else {
        setSuccess(complete ? `Completed: "${task.title}"` : `Reopened: "${task.title}"`);
        router.refresh();
      }
    });
  }

  function toggleOverdueTask(task: TodayTask) {
    setError(null);
    // Mark overdue task complete and move into today's completed list
    setLocalOverdueTasks((current) => current.filter((item) => item.id !== task.id));
    setLocalTasks((current) => [{ ...task, completedToday: true, status: "completed" }, ...current]);
    startTransition(async () => {
      const result = await completeTaskAction(task.id);
      if (!result.ok) {
        setLocalOverdueTasks((current) => [task, ...current]);
        setLocalTasks((current) => current.filter((item) => item.id !== task.id));
        setError(result.error);
      } else {
        setSuccess(`Overdue task completed: "${task.title}"`);
        router.refresh();
      }
    });
  }

  function saveNewTask(form: TaskFormState) {
    setError(null);
    const input = {
      title: form.title,
      description: form.description || undefined,
      track: form.track,
      priority: Number(form.priority),
      dueOn: form.dueOn || undefined,
      scheduledFor: form.scheduledFor || undefined,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      roadmapWeekId: form.roadmapWeekId || undefined,
    };
    startTransition(async () => {
      const result = await createTaskAction(input);
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess("Task created.");
      router.refresh();
    });
  }

  function saveEditedTask(taskId: string, form: TaskFormState) {
    setError(null);
    const input = {
      title: form.title,
      description: form.description || undefined,
      track: form.track,
      priority: Number(form.priority),
      dueOn: form.dueOn || undefined,
      scheduledFor: form.scheduledFor || undefined,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      roadmapWeekId: form.roadmapWeekId || undefined,
    };
    startTransition(async () => {
      const result = await updateTaskAction(taskId, input);
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
      setLocalOverdueTasks((current) => current.filter((t) => t.id !== taskId));
      setSuccess("Task deleted.");
      router.refresh();
    });
  }

  function pauseActiveSession() {
    if (!activeFocus) return;
    startTransition(async () => {
      const result = await pauseFocusAction(activeFocus.id);
      if (!result.ok) { setError(result.error); return; }
      setActiveFocus({
        ...activeFocus,
        status: "paused",
        activeStartedAt: null,
        durationSeconds: result.durationSeconds ?? activeFocusSeconds,
      });
      router.refresh();
    });
  }

  function resumeActiveSession() {
    if (!activeFocus) return;
    startTransition(async () => {
      const result = await resumeFocusAction(activeFocus.id);
      if (!result.ok) { setError(result.error); return; }
      setActiveFocus({
        ...activeFocus,
        status: "active",
        activeStartedAt: new Date().toISOString(),
      });
      setNow(Date.now());
      router.refresh();
    });
  }

  function stopActiveSession(completeTask: boolean) {
    if (!activeFocus) return;
    startTransition(async () => {
      const result = await stopFocusAction(activeFocus.id, completeTask);
      if (!result.ok) { setError(result.error); return; }
      setActiveFocus(null);
      setSuccess(completeTask ? "Focus ended and task marked complete." : "Focus session exited.");
      router.refresh();
    });
  }

  function saveReport(form: { wins: string; blockers: string; energy: string }) {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyReportAction(form);
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess("Daily report logged.");
      router.refresh();
    });
  }

  function saveReview(form: { summary: string; lessons: string; nextFocus: string }) {
    setError(null);
    startTransition(async () => {
      const result = await saveWeeklyReviewAction(form);
      if (!result.ok) { setError(result.error); return; }
      setModal(null);
      setSuccess("Weekly review saved.");
      router.refresh();
    });
  }

  if (!data.authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12">
        <Badge tone="primary">Today</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to access your daily execution command center.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your daily command center is private to your authenticated workspace.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* STEP 2: DAILY COMMAND CENTER HEADER */}
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              <CalendarClock size={14} />{data.dayOfWeek}, {data.displayDate}
            </p>
            <Badge tone={copy.tone} dot>{copy.label}</Badge>
            {data.week ? (
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-tint)] px-3 py-1 text-xs font-semibold text-[var(--violet)] transition hover:opacity-85"
                title="View active roadmap week"
              >
                <Map size={12} />
                {data.week.objective ? `Week 1 · ${data.week.objective.slice(0, 32)}...` : `Week of ${data.week.weekStart}`}
              </Link>
            ) : null}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Daily Execution Center</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">{copy.message}</p>
        </div>

        {/* Command Center Quick KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Planned</p>
            <p className="mt-1 text-2xl font-bold">{plannedCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Completed</p>
            <p className="mt-1 text-2xl font-bold text-[var(--success)]">{completedCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Remaining</p>
            <p className="mt-1 text-2xl font-bold">{remainingCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Minimum</p>
            <p className="mt-1 text-xs font-bold sm:text-sm">
              <span className={`inline-block rounded-md px-2 py-1 ${minimumMet ? "bg-[var(--success-tint)] text-[var(--success)]" : "bg-[var(--warning-tint)] text-[var(--warning)]"}`}>
                {minimumMet ? "Met" : `${completedCount}/${data.dailyMinimumTasks}`}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Notifications / Alerts */}
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

      {/* STEP 8: ACTIVE FOCUS SESSION BANNER */}
      {activeFocus ? (
        <section className="mt-6 rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-5 sm:p-6 shadow-[var(--shadow-sm)]" aria-label="Active focus session">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-md">
                <Zap size={24} className="animate-pulse" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={activeFocus.status === "paused" ? "warning" : "success"} dot>
                    {activeFocus.status === "paused" ? "Focus Paused" : "Focus Active"}
                  </Badge>
                  <span className="text-xs uppercase tracking-wider text-[var(--muted)]">Focus Mode</span>
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                  {activeFocus.taskTitle ?? "Active focus task"}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 lg:self-center">
              <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Elapsed</p>
                <p className="font-mono text-2xl font-bold tracking-tight text-[var(--ink)]" aria-live="polite">
                  {formatDuration(activeFocusSeconds)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeFocus.status === "active" ? (
                  <Button type="button" variant="secondary" onClick={pauseActiveSession} disabled={pending} title="Pause focus session">
                    <Pause size={16} />Pause
                  </Button>
                ) : (
                  <Button type="button" onClick={resumeActiveSession} disabled={pending} title="Resume focus session">
                    <Play size={16} />Resume
                  </Button>
                )}

                <Link
                  href={activeFocus.taskId ? `/focus?task=${activeFocus.taskId}` : "/focus"}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <Zap size={16} />Full Screen
                </Link>

                <Button type="button" variant="secondary" onClick={() => stopActiveSession(true)} disabled={pending} title="Complete task and stop">
                  <Check size={16} />Complete & Stop
                </Button>

                <Button type="button" variant="secondary" onClick={() => stopActiveSession(false)} disabled={pending} title="Exit session without completing">
                  <Square size={15} />Exit
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* STEP 11: MISSED DAY / RECOVERY GUIDANCE */}
      {data.missedYesterday && data.currentStreak === 0 ? (
        <section className="mt-6 rounded-3xl border border-[var(--warning-soft)] bg-[var(--warning-tint)] p-6 sm:p-7" aria-labelledby="recovery-heading">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]">
                <Flame size={15} />Recovery Mode
              </p>
              <h2 id="recovery-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {data.yesterdayStats
                  ? `Yesterday had ${data.yesterdayStats.completedCount} completed task${data.yesterdayStats.completedCount === 1 ? "" : "s"} and ${data.yesterdayStats.incompleteCount} incomplete task${data.yesterdayStats.incompleteCount === 1 ? "" : "s"}.`
                  : "Yesterday had 0 completed tasks recorded."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
                Protect today&apos;s baseline: complete 1 high-priority task, log 15–30 minutes of focused work, and submit today&apos;s report. Do not restart the roadmap.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {doThisNext ? (
                <Link
                  href={`/focus?task=${doThisNext.task.id}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                >
                  <Zap size={16} />Start Priority Task
                </Link>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => setModal("report")}>
                <FileText size={16} />Daily Report
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* STEP 3 & 14: "DO THIS NEXT" PRIORITY EXECUTION */}
      <section className="mt-8" aria-labelledby="do-this-next-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
              <Zap size={14} />Priority Execution
            </p>
            <h2 id="do-this-next-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Do This Next</h2>
          </div>
          <span className="text-xs text-[var(--muted)]">Deterministic priority ordering</span>
        </div>

        {doThisNext ? (
          <article className="rounded-3xl border-2 border-[var(--primary)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] transition hover:shadow-lg sm:p-7">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => (doThisNext.task.dueOn && doThisNext.task.dueOn < data.today && !localTasks.some(t => t.id === doThisNext.task.id) ? toggleOverdueTask(doThisNext.task) : toggleTask(doThisNext.task))}
                  disabled={pending}
                  aria-label={`Complete ${doThisNext.task.title}`}
                  className="mt-1 self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <CompletionIndicator complete={doThisNext.task.completedToday} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary" dot>{doThisNext.reason}</Badge>
                    <Badge tone={trackBadgeTone(doThisNext.task.track)}>{doThisNext.task.track}</Badge>
                    <Badge tone={priorityLabel(doThisNext.task.priority).tone}>{priorityLabel(doThisNext.task.priority).label}</Badge>
                    {doThisNext.task.status === "in_progress" ? <Badge tone="primary">In Progress</Badge> : null}
                  </div>
                  <h3 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl text-[var(--ink)]">
                    {doThisNext.task.title}
                  </h3>
                  {doThisNext.task.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{doThisNext.task.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                    {doThisNext.task.dueOn ? (
                      <span className={`inline-flex items-center gap-1 font-medium ${doThisNext.task.dueOn < data.today ? "font-bold text-[var(--danger)]" : ""}`}>
                        <CalendarClock size={13} />
                        {doThisNext.task.dueOn < data.today ? `Overdue (${doThisNext.task.dueOn})` : `Due ${doThisNext.task.dueOn}`}
                      </span>
                    ) : null}
                    {doThisNext.task.estimatedMinutes ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} />{formatMinutes(doThisNext.task.estimatedMinutes)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Actions for Do This Next */}
              <div className="flex flex-wrap items-center gap-2 lg:self-center">
                <Link
                  href={`/focus?task=${doThisNext.task.id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <Zap size={16} />Start Focus
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingTask(doThisNext.task)}
                  className="min-h-11 px-4"
                  title="Edit task details"
                >
                  <Edit3 size={16} />Edit
                </Button>
                <Link
                  href={`/tasks?task=${doThisNext.task.id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"
                >
                  <RefreshCcw size={15} />Details
                </Link>
              </div>
            </div>
          </article>
        ) : plannedCount > 0 && remainingCount === 0 ? (
          <article className="rounded-3xl border border-[var(--success-soft)] bg-[var(--success-tint)] p-7 text-center">
            <CheckCircle2 className="mx-auto text-[var(--success)]" size={36} />
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)]">All planned actions completed for today!</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              You protected today&apos;s standard. Complete today&apos;s report to lock in your daily streak, or add another action if work remains clear.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={() => setModal("report")}><FileText size={16} />Complete Daily Report</Button>
              <Button type="button" variant="secondary" onClick={() => setModal("add")}><Plus size={16} />Quick Add Task</Button>
            </div>
          </article>
        ) : (
          <article className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
            <Target className="mx-auto text-[var(--muted)]" size={32} />
            <h3 className="mt-3 text-xl font-semibold">No tasks scheduled for today</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              Set one clear high-priority action to establish direction and create initial momentum.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={() => setModal("add")}><Plus size={16} />Add First Task</Button>
              <Link
                href="/tasks"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)]"
              >
                Browse All Tasks <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        )}
      </section>

      {/* STEP 6 & 15: DAILY PROGRESS & STREAK OVERVIEW */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-labelledby="daily-progress-heading">
        <div className="rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
                <Target size={15} />Daily Execution Progress
              </div>
              <h2 id="daily-progress-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {completedCount} of {plannedCount} tasks complete ({percent}%)
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--muted)]">Daily minimum: {data.dailyMinimumTasks} task{data.dailyMinimumTasks === 1 ? "" : "s"}.</span>
                <Badge tone={minimumMet ? "success" : "warning"}>
                  {minimumMet ? "Minimum Met" : "Pending Minimum"}
                </Badge>
              </div>
            </div>
            <ProgressRing value={percent} label="today" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--muted)]">Completed Time</p>
              <p className="mt-2 text-xl font-semibold">{formatMinutes(completedMinutes)}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--muted)]">Remaining Time</p>
              <p className="mt-2 text-xl font-semibold">{formatMinutes(remainingMinutes)}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-xs text-[var(--muted)]">Focus Logged</p>
              <p className="mt-2 text-xl font-semibold">{data.focusedMinutesToday !== null ? `${data.focusedMinutesToday} min` : "0 min"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setModal("add")}><Plus size={16} />Quick Add Task</Button>
            <Button type="button" variant="secondary" onClick={() => setModal("report")}><FileText size={16} />{data.report ? "Edit Daily Report" : "Daily Checkout Report"}</Button>
            <Link
              href="/focus"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)]"
            >
              <Zap size={16} />Focus Mode
            </Link>
          </div>
        </div>

        {/* Streak & Consistency Card */}
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--warning)]">🔥 Consistency & Streak</p>
          {data.currentStreak > 0 ? (
            <div className="mt-6">
              <StreakIndicator days={data.currentStreak} />
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs text-[var(--muted)]">Longest Streak</p>
                  <p className="mt-1 text-lg font-semibold">{data.longestStreak} days</p>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs text-[var(--muted)]">Productive Days</p>
                  <p className="mt-1 text-lg font-semibold">{data.productiveDays}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="Your streak starts today." detail="Complete one meaningful task today to record your first execution signal." />
            </div>
          )}
        </div>
      </section>

      {/* STEP 7: EXECUTION BY TRACK */}
      <section className="mt-8" aria-labelledby="tracks-summary-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
              <Layers size={14} />Execution By Track
            </p>
            <h2 id="tracks-summary-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Business Tracks</h2>
          </div>
          <span className="text-xs text-[var(--muted)]">Real task metrics</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {trackSummaries.map((ts) => {
            const trackPercent = ts.planned > 0 ? Math.round((ts.completed / ts.planned) * 100) : 0;
            return (
              <div
                key={ts.track}
                onClick={() => setSelectedTrack(selectedTrack === ts.track ? "All" : ts.track)}
                className={`cursor-pointer rounded-2xl border p-5 transition shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] ${selectedTrack === ts.track ? "border-[var(--primary)] bg-[var(--primary-tint)]/30" : "border-[var(--line)] bg-[var(--surface)]"}`}
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${ts.track}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={trackBadgeTone(ts.track)}>{ts.track}</Badge>
                  <span className="text-xs font-bold">{trackPercent}%</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{ts.track}</h3>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                  <div className="rounded-lg bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Planned</span>
                    <span className="font-bold">{ts.planned}</span>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Done</span>
                    <span className="font-bold text-[var(--success)]">{ts.completed}</span>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-muted)] py-1.5">
                    <span className="block text-[10px] text-[var(--muted)] uppercase">Left</span>
                    <span className="font-bold">{ts.remaining}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={trackPercent} label={`${ts.completed} of ${ts.planned} complete`} tone={trackBadgeTone(ts.track)} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STEP 9: OVERDUE HANDLING */}
      {localOverdueTasks.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-[var(--danger-soft)] bg-[var(--danger-tint)]/40 p-6 sm:p-7" aria-labelledby="overdue-heading">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--danger-tint)] text-[var(--danger)]">
                <AlertTriangle size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--danger)]">Overdue Work</p>
                  <Badge tone="danger">{localOverdueTasks.length} task{localOverdueTasks.length === 1 ? "" : "s"}</Badge>
                </div>
                <h2 id="overdue-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  Overdue Tasks ({localOverdueTasks.length})
                </h2>
              </div>
            </div>
            <IconButton
              onClick={() => setShowOverdueSection(!showOverdueSection)}
              aria-label={showOverdueSection ? "Collapse overdue tasks" : "Expand overdue tasks"}
            >
              {showOverdueSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </IconButton>
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
            These tasks had due dates before today and remain open. You decide whether to complete, start, or reschedule them.
          </p>

          {showOverdueSection ? (
            <div className="mt-4 space-y-2.5">
              {localOverdueTasks.map((task) => (
                <article
                  key={task.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleOverdueTask(task)}
                      disabled={pending}
                      aria-label={`Complete overdue task ${task.title}`}
                      className="mt-0.5 self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <CompletionIndicator complete={false} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="danger">Due {task.dueOn}</Badge>
                        <Badge tone={trackBadgeTone(task.track)}>{task.track}</Badge>
                        <Badge tone={priorityLabel(task.priority).tone}>{priorityLabel(task.priority).label}</Badge>
                      </div>
                      <h4 className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{task.title}</h4>
                      {task.description ? <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1">{task.description}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Link
                      href={`/focus?task=${task.id}`}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                    >
                      <Zap size={14} />Focus
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingTask(task)}
                      className="min-h-9 px-3 text-xs"
                    >
                      <Edit3 size={14} />Reschedule
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* STEP 4 & 5: TODAY'S TASK BOARD */}
      <section className="mt-8" aria-labelledby="today-board-heading">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Execution Board</p>
            <h2 id="today-board-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
              Today&apos;s Tasks ({visibleTasks.length})
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
            {tracks.map((track) => {
              const count = localTasks.filter((t) => t.track === track).length;
              return (
                <button
                  key={track}
                  type="button"
                  onClick={() => setSelectedTrack(track)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${selectedTrack === track ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                >
                  {track.split(" ")[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Cards - Incomplete Tasks */}
        {incompleteTasks.length > 0 ? (
          <div className="space-y-3">
            {incompleteTasks.map((task) => {
              const priority = priorityLabel(task.priority);
              const overdue = Boolean(task.dueOn && task.dueOn < data.today);
              return (
                <article
                  key={task.id}
                  className={`flex flex-col gap-4 rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)] sm:flex-row sm:items-center ${overdue ? "border-[var(--danger-soft)]" : "border-[var(--line)]"}`}
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
                      <Badge tone={trackBadgeTone(task.track)}>{task.track}</Badge>
                      <Badge tone={priority.tone}>{priority.label}</Badge>
                      {task.status === "in_progress" ? <Badge tone="primary">In progress</Badge> : null}
                      {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                    </div>

                    <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">{task.title}</h3>
                    {task.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{task.description}</p> : null}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                      {task.dueOn ? (
                        <span className={`inline-flex items-center gap-1 ${overdue ? "font-bold text-[var(--danger)]" : ""}`}>
                          <CalendarClock size={13} />{overdue ? `Overdue (${task.dueOn})` : `Due ${task.dueOn}`}
                        </span>
                      ) : null}
                      {task.estimatedMinutes ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={13} />{formatMinutes(task.estimatedMinutes)}
                        </span>
                      ) : null}
                      {task.roadmapWeekId ? <Badge tone="violet">Roadmap Linked</Badge> : null}
                    </div>
                  </div>

                  {/* Quick Execution Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Link
                      href={`/focus?task=${task.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      title="Start Focus session"
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
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"
                      title="Task details"
                    >
                      <RefreshCcw size={15} />Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
            <p className="text-base font-semibold">No tasks found for {selectedTrack === "All" ? "today" : selectedTrack}.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">Add a task to schedule actions for today.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Button type="button" onClick={() => setModal("add")}><Plus size={16} />Quick Add Task</Button>
            </div>
          </div>
        ) : null}

        {/* Completed Today Section */}
        {completedTasks.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between pb-3">
              <button
                type="button"
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <CheckCircle2 size={16} className="text-[var(--success)]" />
                Completed Today ({completedTasks.length})
                {showCompletedSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showCompletedSection ? (
              <div className="space-y-2.5">
                {completedTasks.map((task) => (
                  <article
                    key={task.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/50 p-4 opacity-80 sm:flex-row sm:items-center sm:justify-between"
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
                          <Badge tone={trackBadgeTone(task.track)}>{task.track}</Badge>
                          <Badge tone="success">Completed</Badge>
                        </div>
                        <h4 className="mt-1 text-sm font-semibold text-[var(--muted)] line-through">{task.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => toggleTask(task)}
                        className="text-xs min-h-8 px-2.5"
                      >
                        Reopen
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* STEP 12: ROADMAP CONTEXT */}
      {data.roadmap ? (
        <section className="mt-8 rounded-3xl border border-[var(--violet-tint)] bg-[var(--violet-tint)] p-6 sm:p-8" aria-labelledby="roadmap-context-heading">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--violet)]">
                <Map size={15} />Active Roadmap Alignment
              </p>
              <h2 id="roadmap-context-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {data.week?.objective ?? data.roadmap.weekTitle ?? "Current Week Execution"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
                {data.roadmap.objective || "Keep the higher-order direction visible while executing daily tasks."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] sm:grid-cols-4">
              <div className="rounded-lg bg-[var(--primary-tint)] px-2 py-3 text-[var(--primary)]">Year {data.roadmap.year}</div>
              <div className="rounded-lg bg-[var(--violet-tint)] px-2 py-3 text-[var(--violet)]">{data.roadmap.phaseTitle ?? "Phase"}</div>
              <div className="rounded-lg bg-[var(--surface)] px-2 py-3">{data.roadmap.monthTitle ?? "Month"}</div>
              <div className="rounded-lg bg-[var(--success-tint)] px-2 py-3 text-[var(--success)]">{data.roadmap.weekTitle ?? "Week"}</div>
            </div>
          </div>

          {data.week ? (
            <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <ProgressBar
                  value={data.week.completionPercent}
                  label={`${data.week.completedCount} of ${data.week.totalCount} weekly tasks complete (${data.week.completionPercent}%)`}
                  tone="violet"
                />
              </div>
              <Link
                href="/roadmap"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--violet)] hover:text-[var(--violet)]"
              >
                Open Roadmap <ArrowRight size={15} />
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-8" aria-labelledby="no-roadmap-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">Roadmap Context</p>
              <h2 id="no-roadmap-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em]">No active roadmap context yet</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Connect your goal to a current week to see the full planning chain here.</p>
            </div>
            <Link
              href="/roadmap"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              Open Roadmap <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* STEP 10: END-OF-DAY CHECKOUT */}
      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8" aria-labelledby="checkout-heading">
        <div className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone={data.report ? "success" : "primary"}>{data.report ? "Checkout Logged" : "Daily Checkout Ready"}</Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">End the Day</span>
            </div>
            <h2 id="checkout-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Daily Checkout & Report
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Review completed work, confirm daily floor was met, and record today&apos;s observations before closing out.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setModal("report")} className="min-h-11">
              <FileText size={16} />{data.report ? "Edit Daily Report" : "Complete Daily Report"}
            </Button>
            <Link
              href="/reports"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              Reports Archive <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Checkout Summary Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
            <p className="text-xs text-[var(--muted)]">Execution Ratio</p>
            <p className="mt-2 text-xl font-bold">{completedCount} of {plannedCount} done</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{percent}% completion rate</p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
            <p className="text-xs text-[var(--muted)]">Focus Time</p>
            <p className="mt-2 text-xl font-bold">{data.focusedMinutesToday ?? 0} minutes</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Recorded in Focus Mode</p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
            <p className="text-xs text-[var(--muted)]">Daily Minimum</p>
            <p className={`mt-2 text-xl font-bold ${minimumMet ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
              {minimumMet ? "Floor Protected" : "Floor Unmet"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{data.dailyMinimumTasks} required</p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
            <p className="text-xs text-[var(--muted)]">Daily Report</p>
            <p className={`mt-2 text-xl font-bold ${data.report ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
              {data.report ? "Submitted" : "Not Submitted"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{data.report?.energy ? `Energy: ${data.report.energy}/10` : "No energy logged"}</p>
          </div>
        </div>

        {/* Existing Report Details */}
        {data.report ? (
          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Logged Report Summary</h4>
              <button
                type="button"
                onClick={() => setModal("report")}
                className="text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                Edit
              </button>
            </div>
            {data.report.wins ? (
              <p className="text-sm leading-6 text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">Wins: </span>{data.report.wins}
              </p>
            ) : null}
            {data.report.blockers ? (
              <p className="text-sm leading-6 text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">Blockers: </span>{data.report.blockers}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-[var(--line-strong)] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Daily report pending</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Logging daily wins and blockers locks in your streak and gives Weekly Reviews real evidence.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setModal("report")} className="shrink-0">
              <FileText size={16} />Write Today&apos;s Report
            </Button>
          </div>
        )}
      </section>

      {/* MODALS */}
      {modal === "add" ? (
        <QuickAddForm
          today={data.today}
          roadmapWeeks={data.roadmapWeeks}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={saveNewTask}
        />
      ) : null}

      {editingTask ? (
        <EditTaskForm
          task={editingTask}
          roadmapWeeks={data.roadmapWeeks}
          pending={pending}
          error={error}
          onClose={() => setEditingTask(null)}
          onSubmit={saveEditedTask}
          onDelete={deleteTask}
        />
      ) : null}

      {modal === "report" ? (
        <ReportForm
          report={data.report}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={saveReport}
        />
      ) : null}

      {modal === "review" ? (
        <ReviewForm
          review={data.weeklyReview}
          pending={pending}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={saveReview}
        />
      ) : null}
    </div>
  );
}
