// Roadmap import validation and normalization.
// Pure functions: no database access, no side effects. Used by both the
// dry-run (validate) and the actual import action.

export const roadmapStatuses = ["planned", "active", "completed", "archived"] as const;
export const taskStatuses = ["inbox", "planned", "in_progress", "completed", "cancelled"] as const;
export const milestoneStatuses = ["planned", "achieved", "missed", "archived"] as const;

export type ImportTask = {
  importKey: string;
  title: string;
  description?: string | null;
  priority?: number;
  dueOn?: string | null;
  scheduledFor?: string | null;
  estimatedMinutes?: number | null;
  status?: string;
};

export type ImportWeek = {
  importKey: string;
  weekStart: string;
  weekEnd?: string | null;
  objective?: string | null;
  status?: string;
  tasks: ImportTask[];
};

export type ImportMonth = {
  importKey: string;
  monthStart: string;
  title: string;
  objective?: string | null;
  status?: string;
  weeks: ImportWeek[];
};

export type ImportPhase = {
  importKey: string;
  title: string;
  objective?: string | null;
  sortOrder?: number;
  status?: string;
  months: ImportMonth[];
};

export type ImportYear = {
  importKey: string;
  year: number;
  title: string;
  objective?: string | null;
  status?: string;
  phases: ImportPhase[];
};

export type ImportGoal = {
  importKey: string;
  title: string;
  description?: string | null;
  horizonYears?: number | null;
  targetDate?: string | null;
  status?: string;
};

export type ImportMilestone = {
  importKey: string;
  title: string;
  description?: string | null;
  dueOn?: string | null;
  status?: string;
  track?: string | null;
};

export type ImportRoadmap = {
  goal: ImportGoal;
  years: ImportYear[];
  milestones?: ImportMilestone[];
};

export type ValidationIssue = { path: string; message: string };

export type ValidationResult =
  | { ok: true; roadmap: ImportRoadmap; counts: ImportCounts }
  | { ok: false; issues: ValidationIssue[] };

export type ImportCounts = {
  goals: number;
  years: number;
  phases: number;
  months: number;
  weeks: number;
  tasks: number;
  milestones: number;
};

// ---- Limits (documented) ----
export const IMPORT_LIMITS = {
  maxPayloadBytes: 512 * 1024, // 512 KB
  maxYears: 20,
  maxPhasesPerYear: 12,
  maxMonthsPerPhase: 24,
  maxWeeksPerMonth: 8,
  maxTasksPerWeek: 50,
  maxMilestones: 200,
  maxTitleLength: 160,
  maxObjectiveLength: 500,
  maxDescriptionLength: 1000,
  maxTaskDescriptionLength: 2000,
} as const;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthStartPattern = /^\d{4}-\d{2}-01$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStatus(record: Record<string, unknown>, allowed: readonly string[], fallback: string): string {
  const value = record.status;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value;
  return fallback;
}

function validateDate(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !datePattern.test(value)) {
    issues.push({ path, message: "must be a valid date in YYYY-MM-DD format" });
    return null;
  }
  return value;
}

function validateImportKey(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (typeof value !== "string" || !value.trim()) {
    issues.push({ path, message: "importKey is required" });
    return null;
  }
  const key = value.trim();
  if (key.length > 200) {
    issues.push({ path, message: "importKey must be 200 characters or fewer" });
    return null;
  }
  return key;
}

function validateTitle(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (typeof value !== "string" || !value.trim()) {
    issues.push({ path, message: "title is required" });
    return null;
  }
  const title = value.trim();
  if (title.length > IMPORT_LIMITS.maxTitleLength) {
    issues.push({ path, message: `title must be ${IMPORT_LIMITS.maxTitleLength} characters or fewer` });
    return null;
  }
  return title;
}

function validateObjective(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    issues.push({ path, message: "objective must be a string" });
    return null;
  }
  const text = value.trim();
  if (text.length > IMPORT_LIMITS.maxObjectiveLength) {
    issues.push({ path, message: `objective must be ${IMPORT_LIMITS.maxObjectiveLength} characters or fewer` });
    return null;
  }
  return text || null;
}

function validateDescription(value: unknown, path: string, issues: ValidationIssue[], maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    issues.push({ path, message: "description must be a string" });
    return null;
  }
  const text = value.trim();
  if (text.length > maxLength) {
    issues.push({ path, message: `description must be ${maxLength} characters or fewer` });
    return null;
  }
  return text || null;
}

function validatePriority(value: unknown, path: string, issues: ValidationIssue[]): number {
  if (value === undefined || value === null) return 3;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    issues.push({ path, message: "priority must be an integer between 1 and 5" });
    return 3;
  }
  return value;
}

function validateEstimatedMinutes(value: unknown, path: string, issues: ValidationIssue[]): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 1440) {
    issues.push({ path, message: "estimatedMinutes must be an integer between 1 and 1440" });
    return null;
  }
  return value;
}

function validateYear(value: unknown, path: string, issues: ValidationIssue[]): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 2000 || value > 2200) {
    issues.push({ path, message: "year must be an integer between 2000 and 2200" });
    return null;
  }
  return value;
}

function validateMonthStart(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (typeof value !== "string" || !monthStartPattern.test(value)) {
    issues.push({ path, message: "monthStart must be the first day of a month (YYYY-MM-01)" });
    return null;
  }
  return value;
}

function validateWeekStart(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (typeof value !== "string" || !datePattern.test(value)) {
    issues.push({ path, message: "weekStart must be a valid date in YYYY-MM-DD format" });
    return null;
  }
  return value;
}

function validateSortOrder(value: unknown, path: string, issues: ValidationIssue[]): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    issues.push({ path, message: "sortOrder must be a non-negative integer" });
    return 0;
  }
  return value;
}

function validateTrack(value: unknown, path: string, issues: ValidationIssue[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    issues.push({ path, message: "track must be a string" });
    return null;
  }
  const track = value.trim();
  if (track.length > 40) {
    issues.push({ path, message: "track must be 40 characters or fewer" });
    return null;
  }
  return track || null;
}

function validateTask(record: unknown, path: string, issues: ValidationIssue[]): ImportTask | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "task must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const title = validateTitle(record.title, `${path}.title`, issues);
  if (!importKey || !title) return null;
  return {
    importKey,
    title,
    description: validateDescription(record.description, `${path}.description`, issues, IMPORT_LIMITS.maxTaskDescriptionLength),
    priority: validatePriority(record.priority, `${path}.priority`, issues),
    dueOn: validateDate(record.dueOn, `${path}.dueOn`, issues),
    scheduledFor: validateDate(record.scheduledFor, `${path}.scheduledFor`, issues),
    estimatedMinutes: validateEstimatedMinutes(record.estimatedMinutes, `${path}.estimatedMinutes`, issues),
    status: readStatus(record, taskStatuses, "inbox"),
  };
}

function validateWeek(record: unknown, path: string, issues: ValidationIssue[]): ImportWeek | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "week must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const weekStart = validateWeekStart(record.weekStart, `${path}.weekStart`, issues);
  if (!importKey || !weekStart) return null;

  const weekEnd = validateDate(record.weekEnd, `${path}.weekEnd`, issues);
  if (weekEnd && weekEnd < weekStart) {
    issues.push({ path: `${path}.weekEnd`, message: "weekEnd must be on or after weekStart" });
  }

  const tasks: ImportTask[] = [];
  if (record.tasks !== undefined) {
    if (!Array.isArray(record.tasks)) {
      issues.push({ path: `${path}.tasks`, message: "tasks must be an array" });
    } else if (record.tasks.length > IMPORT_LIMITS.maxTasksPerWeek) {
      issues.push({ path: `${path}.tasks`, message: `a week may contain at most ${IMPORT_LIMITS.maxTasksPerWeek} tasks` });
    } else {
      record.tasks.forEach((task, index) => {
        const validated = validateTask(task, `${path}.tasks[${index}]`, issues);
        if (validated) tasks.push(validated);
      });
    }
  }

  return {
    importKey,
    weekStart,
    weekEnd,
    objective: validateObjective(record.objective, `${path}.objective`, issues),
    status: readStatus(record, roadmapStatuses, "planned"),
    tasks,
  };
}

function validateMonth(record: unknown, path: string, issues: ValidationIssue[]): ImportMonth | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "month must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const monthStart = validateMonthStart(record.monthStart, `${path}.monthStart`, issues);
  const title = validateTitle(record.title, `${path}.title`, issues);
  if (!importKey || !monthStart || !title) return null;

  const weeks: ImportWeek[] = [];
  if (record.weeks !== undefined) {
    if (!Array.isArray(record.weeks)) {
      issues.push({ path: `${path}.weeks`, message: "weeks must be an array" });
    } else if (record.weeks.length > IMPORT_LIMITS.maxWeeksPerMonth) {
      issues.push({ path: `${path}.weeks`, message: `a month may contain at most ${IMPORT_LIMITS.maxWeeksPerMonth} weeks` });
    } else {
      record.weeks.forEach((week, index) => {
        const validated = validateWeek(week, `${path}.weeks[${index}]`, issues);
        if (validated) weeks.push(validated);
      });
    }
  }

  return {
    importKey,
    monthStart,
    title,
    objective: validateObjective(record.objective, `${path}.objective`, issues),
    status: readStatus(record, roadmapStatuses, "planned"),
    weeks,
  };
}

function validatePhase(record: unknown, path: string, issues: ValidationIssue[]): ImportPhase | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "phase must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const title = validateTitle(record.title, `${path}.title`, issues);
  if (!importKey || !title) return null;

  const months: ImportMonth[] = [];
  if (record.months !== undefined) {
    if (!Array.isArray(record.months)) {
      issues.push({ path: `${path}.months`, message: "months must be an array" });
    } else if (record.months.length > IMPORT_LIMITS.maxMonthsPerPhase) {
      issues.push({ path: `${path}.months`, message: `a phase may contain at most ${IMPORT_LIMITS.maxMonthsPerPhase} months` });
    } else {
      record.months.forEach((month, index) => {
        const validated = validateMonth(month, `${path}.months[${index}]`, issues);
        if (validated) months.push(validated);
      });
    }
  }

  return {
    importKey,
    title,
    objective: validateObjective(record.objective, `${path}.objective`, issues),
    sortOrder: validateSortOrder(record.sortOrder, `${path}.sortOrder`, issues),
    status: readStatus(record, roadmapStatuses, "planned"),
    months,
  };
}

function validateYearRecord(record: unknown, path: string, issues: ValidationIssue[]): ImportYear | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "year must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const year = validateYear(record.year, `${path}.year`, issues);
  const title = validateTitle(record.title, `${path}.title`, issues);
  if (!importKey || year === null || !title) return null;

  const phases: ImportPhase[] = [];
  if (record.phases !== undefined) {
    if (!Array.isArray(record.phases)) {
      issues.push({ path: `${path}.phases`, message: "phases must be an array" });
    } else if (record.phases.length > IMPORT_LIMITS.maxPhasesPerYear) {
      issues.push({ path: `${path}.phases`, message: `a year may contain at most ${IMPORT_LIMITS.maxPhasesPerYear} phases` });
    } else {
      record.phases.forEach((phase, index) => {
        const validated = validatePhase(phase, `${path}.phases[${index}]`, issues);
        if (validated) phases.push(validated);
      });
    }
  }

  return {
    importKey,
    year,
    title,
    objective: validateObjective(record.objective, `${path}.objective`, issues),
    status: readStatus(record, roadmapStatuses, "planned"),
    phases,
  };
}

function validateMilestone(record: unknown, path: string, issues: ValidationIssue[]): ImportMilestone | null {
  if (!isRecord(record)) {
    issues.push({ path, message: "milestone must be an object" });
    return null;
  }
  const importKey = validateImportKey(record.importKey, `${path}.importKey`, issues);
  const title = validateTitle(record.title, `${path}.title`, issues);
  if (!importKey || !title) return null;
  return {
    importKey,
    title,
    description: validateDescription(record.description, `${path}.description`, issues, IMPORT_LIMITS.maxDescriptionLength),
    dueOn: validateDate(record.dueOn, `${path}.dueOn`, issues),
    status: readStatus(record, milestoneStatuses, "planned"),
    track: validateTrack(record.track, `${path}.track`, issues),
  };
}

function countRoadmap(roadmap: ImportRoadmap): ImportCounts {
  let phases = 0;
  let months = 0;
  let weeks = 0;
  let tasks = 0;
  for (const year of roadmap.years) {
    phases += year.phases.length;
    for (const phase of year.phases) {
      months += phase.months.length;
      for (const month of phase.months) {
        weeks += month.weeks.length;
        for (const week of month.weeks) tasks += week.tasks.length;
      }
    }
  }
  return {
    goals: 1,
    years: roadmap.years.length,
    phases,
    months,
    weeks,
    tasks,
    milestones: roadmap.milestones?.length ?? 0,
  };
}

function collectDuplicateKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  return [...duplicates];
}

/**
 * Parse and validate a raw JSON string into a normalized ImportRoadmap.
 * Returns { ok: true, roadmap, counts } on success, or { ok: false, issues }.
 */
export function parseRoadmapInput(raw: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (raw.length > IMPORT_LIMITS.maxPayloadBytes) {
    return { ok: false, issues: [{ path: "payload", message: `Input exceeds the ${IMPORT_LIMITS.maxPayloadBytes / 1024} KB limit.` }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, issues: [{ path: "payload", message: "Input is not valid JSON." }] };
  }

  if (!isRecord(parsed)) {
    return { ok: false, issues: [{ path: "payload", message: "The top-level value must be an object." }] };
  }

  if (!isRecord(parsed.goal)) {
    return { ok: false, issues: [{ path: "goal", message: "A goal object is required." }] };
  }

  const goalImportKey = validateImportKey(parsed.goal.importKey, "goal.importKey", issues);
  const goalTitle = validateTitle(parsed.goal.title, "goal.title", issues);
  const goal: ImportGoal = {
    importKey: goalImportKey ?? "",
    title: goalTitle ?? "",
    description: validateDescription(parsed.goal.description, "goal.description", issues, IMPORT_LIMITS.maxDescriptionLength),
    horizonYears: parsed.goal.horizonYears === undefined || parsed.goal.horizonYears === null ? null : (typeof parsed.goal.horizonYears === "number" && Number.isInteger(parsed.goal.horizonYears) && parsed.goal.horizonYears >= 1 && parsed.goal.horizonYears <= 100 ? parsed.goal.horizonYears : (issues.push({ path: "goal.horizonYears", message: "horizonYears must be an integer between 1 and 100" }), null)),
    targetDate: validateDate(parsed.goal.targetDate, "goal.targetDate", issues),
    status: readStatus(parsed.goal, roadmapStatuses, "active"),
  };

  const years: ImportYear[] = [];
  if (!Array.isArray(parsed.years)) {
    issues.push({ path: "years", message: "years must be an array" });
  } else if (parsed.years.length > IMPORT_LIMITS.maxYears) {
    issues.push({ path: "years", message: `At most ${IMPORT_LIMITS.maxYears} years are allowed.` });
  } else {
    parsed.years.forEach((year, index) => {
      const validated = validateYearRecord(year, `years[${index}]`, issues);
      if (validated) years.push(validated);
    });
  }

  const milestones: ImportMilestone[] = [];
  if (parsed.milestones !== undefined) {
    if (!Array.isArray(parsed.milestones)) {
      issues.push({ path: "milestones", message: "milestones must be an array" });
    } else if (parsed.milestones.length > IMPORT_LIMITS.maxMilestones) {
      issues.push({ path: "milestones", message: `At most ${IMPORT_LIMITS.maxMilestones} milestones are allowed.` });
    } else {
      parsed.milestones.forEach((milestone, index) => {
        const validated = validateMilestone(milestone, `milestones[${index}]`, issues);
        if (validated) milestones.push(validated);
      });
    }
  }

  // Duplicate importKey detection across the whole payload.
  const allKeys: string[] = [goal.importKey];
  for (const year of years) {
    allKeys.push(year.importKey);
    for (const phase of year.phases) {
      allKeys.push(phase.importKey);
      for (const month of phase.months) {
        allKeys.push(month.importKey);
        for (const week of month.weeks) {
          allKeys.push(week.importKey);
          for (const task of week.tasks) allKeys.push(task.importKey);
        }
      }
    }
  }
  for (const milestone of milestones) allKeys.push(milestone.importKey);
  const duplicates = collectDuplicateKeys(allKeys.filter(Boolean));
  for (const key of duplicates) {
    issues.push({ path: "importKey", message: `Duplicate importKey "${key}" found. importKeys must be unique.` });
  }

  if (issues.length > 0) return { ok: false, issues };

  const roadmap: ImportRoadmap = { goal, years, milestones };
  return { ok: true, roadmap, counts: countRoadmap(roadmap) };
}
