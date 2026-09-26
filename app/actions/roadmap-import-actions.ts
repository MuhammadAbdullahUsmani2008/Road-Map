"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { parseRoadmapInput, type ImportCounts, type ImportRoadmap } from "@/lib/roadmap-import";

export type ImportSummary = {
  created: ImportCounts;
  updated: ImportCounts;
  skipped: number;
  warnings: string[];
};

export type ImportActionResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string; issues?: Array<{ path: string; message: string }> };

type UpsertResult = { created: number; updated: number };

function emptyCounts(): ImportCounts {
  return { goals: 0, years: 0, phases: 0, months: 0, weeks: 0, tasks: 0, milestones: 0 };
}

function tally(result: UpsertResult, kind: keyof ImportCounts, created: ImportCounts, updated: ImportCounts) {
  created[kind] += result.created;
  updated[kind] += result.updated;
}

// Upsert a single row by (user_id, import_key). Returns created/updated counts.
// Uses a two-step approach: select existing id, then insert or update.
async function upsertByImportKey(
  supabase: SupabaseClient,
  userId: string,
  table: string,
  importKey: string,
  values: Record<string, unknown>,
): Promise<UpsertResult> {
  const { data: existing } = await supabase.from(table).select("id").eq("user_id", userId).eq("import_key", importKey).maybeSingle();
  if (existing) {
    const { error } = await supabase.from(table).update(values).eq("id", existing.id).eq("user_id", userId);
    if (error) throw new Error(`update ${table}: ${error.message}`);
    return { created: 0, updated: 1 };
  }
  const { error } = await supabase.from(table).insert({ user_id: userId, import_key: importKey, ...values });
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return { created: 1, updated: 0 };
}

export async function validateRoadmapAction(raw: string): Promise<ImportActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before importing a roadmap." };
  const result = parseRoadmapInput(raw);
  if (!result.ok) return { ok: false, error: "The roadmap is not valid.", issues: result.issues };
  return { ok: true, summary: { created: result.counts, updated: emptyCounts(), skipped: 0, warnings: [] } };
}

export async function importRoadmapAction(raw: string): Promise<ImportActionResult> {
  const access = await getAuthorizedAccess();
  if (!access) return { ok: false, error: "Please sign in before importing a roadmap." };
  const { supabase, userId } = access;

  const parsed = parseRoadmapInput(raw);
  if (!parsed.ok) return { ok: false, error: "The roadmap is not valid.", issues: parsed.issues };

  const roadmap: ImportRoadmap = parsed.roadmap;
  const created = emptyCounts();
  const updated = emptyCounts();
  const warnings: string[] = [];

  try {
    // 1. Goal
    const goalResult = await upsertByImportKey(supabase, userId, "goals", roadmap.goal.importKey, {
      title: roadmap.goal.title,
      description: roadmap.goal.description,
      horizon_years: roadmap.goal.horizonYears,
      target_date: roadmap.goal.targetDate,
      status: roadmap.goal.status,
    });
    tally(goalResult, "goals", created, updated);

    // Resolve the goal id (created or existing).
    const { data: goalRow } = await supabase.from("goals").select("id").eq("user_id", userId).eq("import_key", roadmap.goal.importKey).maybeSingle();
    const goalId = goalRow?.id ?? null;

    // 2. Years → Phases → Months → Weeks → Tasks
    for (const year of roadmap.years) {
      const yearResult = await upsertByImportKey(supabase, userId, "roadmap_years", year.importKey, {
        goal_id: goalId,
        year: year.year,
        title: year.title,
        objective: year.objective,
        status: year.status,
      });
      tally(yearResult, "years", created, updated);

      const { data: yearRow } = await supabase.from("roadmap_years").select("id").eq("user_id", userId).eq("import_key", year.importKey).maybeSingle();
      const yearId = yearRow?.id ?? null;

      for (const phase of year.phases) {
        const phaseResult = await upsertByImportKey(supabase, userId, "roadmap_phases", phase.importKey, {
          roadmap_year_id: yearId,
          title: phase.title,
          objective: phase.objective,
          sort_order: phase.sortOrder,
          status: phase.status,
        });
        tally(phaseResult, "phases", created, updated);

        const { data: phaseRow } = await supabase.from("roadmap_phases").select("id").eq("user_id", userId).eq("import_key", phase.importKey).maybeSingle();
        const phaseId = phaseRow?.id ?? null;

        for (const month of phase.months) {
          const monthResult = await upsertByImportKey(supabase, userId, "roadmap_months", month.importKey, {
            roadmap_phase_id: phaseId,
            month_start: month.monthStart,
            title: month.title,
            objective: month.objective,
            status: month.status,
          });
          tally(monthResult, "months", created, updated);

          const { data: monthRow } = await supabase.from("roadmap_months").select("id").eq("user_id", userId).eq("import_key", month.importKey).maybeSingle();
          const monthId = monthRow?.id ?? null;

          for (const week of month.weeks) {
            const weekResult = await upsertByImportKey(supabase, userId, "roadmap_weeks", week.importKey, {
              roadmap_month_id: monthId,
              week_start: week.weekStart,
              week_end: week.weekEnd,
              objective: week.objective,
              status: week.status,
            });
            tally(weekResult, "weeks", created, updated);

            const { data: weekRow } = await supabase.from("roadmap_weeks").select("id").eq("user_id", userId).eq("import_key", week.importKey).maybeSingle();
            const weekId = weekRow?.id ?? null;

            for (const task of week.tasks) {
              const taskResult = await upsertByImportKey(supabase, userId, "tasks", task.importKey, {
                roadmap_week_id: weekId,
                title: task.title,
                description: task.description,
                priority: task.priority,
                due_on: task.dueOn,
                scheduled_for: task.scheduledFor,
                estimated_minutes: task.estimatedMinutes,
                status: task.status,
              });
              tally(taskResult, "tasks", created, updated);
            }
          }
        }
      }
    }

    // 3. Milestones
    for (const milestone of roadmap.milestones ?? []) {
      const milestoneResult = await upsertByImportKey(supabase, userId, "milestones", milestone.importKey, {
        title: milestone.title,
        description: milestone.description,
        due_on: milestone.dueOn,
        status: milestone.status,
        track: milestone.track,
      });
      tally(milestoneResult, "milestones", created, updated);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: `The import could not be completed: ${message}` };
  }

  revalidatePath("/roadmap");
  revalidatePath("/planning");
  revalidatePath("/planning/week");
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/");

  return { ok: true, summary: { created, updated, skipped: 0, warnings } };
}
