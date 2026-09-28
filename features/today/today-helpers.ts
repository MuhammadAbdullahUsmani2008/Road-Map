export type TodayTrack = "E-Commerce" | "YouTube Automation" | "Operating System";

export type TodayTask = {
  id: string;
  title: string;
  description: string | null;
  status: "inbox" | "planned" | "in_progress" | "completed" | "cancelled";
  priority: number;
  dueOn: string | null;
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  roadmapWeekId: string | null;
  track: TodayTrack;
  completedToday: boolean;
  createdAt?: string;
};

export function inferTrack(task: { track?: string | null; import_key?: string | null }): TodayTrack {
  if (task.track === "E-Commerce" || task.track === "YouTube Automation" || task.track === "Operating System") {
    return task.track;
  }
  const key = task.import_key ?? "";
  if (key.includes("task-ec")) return "E-Commerce";
  if (key.includes("task-yt")) return "YouTube Automation";
  if (key.includes("task-os")) return "Operating System";
  if (task.track && task.track.toLowerCase().includes("commerce")) return "E-Commerce";
  if (task.track && task.track.toLowerCase().includes("youtube")) return "YouTube Automation";
  return "Operating System";
}

export function compareTasksDeterministic(left: TodayTask, right: TodayTask, today: string): number {
  const leftComplete = left.completedToday;
  const rightComplete = right.completedToday;
  if (leftComplete !== rightComplete) return leftComplete ? 1 : -1;

  if (!leftComplete) {
    const leftOverdue = Boolean(left.dueOn && left.dueOn < today);
    const rightOverdue = Boolean(right.dueOn && right.dueOn < today);
    const leftHigh = left.priority <= 2;
    const rightHigh = right.priority <= 2;

    // 1. Incomplete overdue high-priority tasks
    const leftOverdueHigh = leftOverdue && leftHigh;
    const rightOverdueHigh = rightOverdue && rightHigh;
    if (leftOverdueHigh !== rightOverdueHigh) return leftOverdueHigh ? -1 : 1;

    // 2. Incomplete tasks scheduled for today
    const leftSchedToday = left.scheduledFor === today;
    const rightSchedToday = right.scheduledFor === today;
    if (leftSchedToday !== rightSchedToday) return leftSchedToday ? -1 : 1;

    // 3. Incomplete high-priority tasks
    if (leftHigh !== rightHigh) return leftHigh ? -1 : 1;

    // 4. Incomplete tasks due today
    const leftDueToday = left.dueOn === today;
    const rightDueToday = right.dueOn === today;
    if (leftDueToday !== rightDueToday) return leftDueToday ? -1 : 1;

    // General priority order (1 -> 5)
    if (left.priority !== right.priority) return left.priority - right.priority;

    // Due date (earlier due first)
    const leftDue = left.dueOn ?? "9999-12-31";
    const rightDue = right.dueOn ?? "9999-12-31";
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue);

    // Estimated minutes (shorter first for momentum)
    const leftMinutes = left.estimatedMinutes ?? 9999;
    const rightMinutes = right.estimatedMinutes ?? 9999;
    if (leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;
  }

  return left.id.localeCompare(right.id);
}

export function getDoThisNextTask(
  tasks: TodayTask[],
  overdueTasks: TodayTask[],
  today: string
): { task: TodayTask; reason: string } | null {
  const incompleteMap = new Map<string, TodayTask>();
  for (const task of tasks) {
    if (!task.completedToday) incompleteMap.set(task.id, task);
  }
  for (const task of overdueTasks) {
    if (!task.completedToday && !incompleteMap.has(task.id)) {
      incompleteMap.set(task.id, task);
    }
  }

  const candidates = Array.from(incompleteMap.values()).sort((a, b) => compareTasksDeterministic(a, b, today));
  if (candidates.length === 0) return null;

  const top = candidates[0];
  let reason = "Next Planned Action";
  const isOverdue = Boolean(top.dueOn && top.dueOn < today);
  const isHigh = top.priority <= 2;

  if (isOverdue && isHigh) reason = "High Priority · Overdue";
  else if (isOverdue) reason = "Overdue Action";
  else if (isHigh && top.scheduledFor === today) reason = "High Priority · Scheduled for Today";
  else if (isHigh && top.dueOn === today) reason = "High Priority · Due Today";
  else if (isHigh) reason = "High Priority Next Action";
  else if (top.scheduledFor === today) reason = "Scheduled for Today";
  else if (top.dueOn === today) reason = "Due Today";

  return { task: top, reason };
}
