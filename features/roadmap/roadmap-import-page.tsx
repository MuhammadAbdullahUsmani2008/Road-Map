"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, CircleAlert, Download, FileJson, Map, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { importRoadmapAction, validateRoadmapAction, type ImportSummary } from "@/app/actions/roadmap-import-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const EXAMPLE = `{
  "goal": {
    "importKey": "goal-master",
    "title": "Example goal",
    "description": "A placeholder description.",
    "horizonYears": 7,
    "status": "active"
  },
  "years": [
    {
      "importKey": "year-2026",
      "year": 2026,
      "title": "Year 1",
      "objective": "Build the foundation.",
      "status": "active",
      "phases": [
        {
          "importKey": "phase-2026-q1",
          "title": "Phase 1",
          "objective": "Establish the system.",
          "sortOrder": 0,
          "status": "active",
          "months": [
            {
              "importKey": "month-2026-09",
              "monthStart": "2026-09-01",
              "title": "September 2026",
              "objective": "First month of execution.",
              "status": "active",
              "weeks": [
                {
                  "importKey": "week-2026-09-28",
                  "weekStart": "2026-09-28",
                  "weekEnd": "2026-10-04",
                  "objective": "First week.",
                  "status": "active",
                  "tasks": [
                    {
                      "importKey": "task-1",
                      "title": "Example task",
                      "priority": 3,
                      "status": "planned"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "milestones": [
    {
      "importKey": "milestone-1",
      "title": "Example milestone",
      "status": "planned"
    }
  ]
}`;

function SummaryBlock({ summary }: { summary: ImportSummary }) {
  const rows: Array<[string, number, number]> = [
    ["Goals", summary.created.goals, summary.updated.goals],
    ["Years", summary.created.years, summary.updated.years],
    ["Phases", summary.created.phases, summary.updated.phases],
    ["Months", summary.created.months, summary.updated.months],
    ["Weeks", summary.created.weeks, summary.updated.weeks],
    ["Tasks", summary.created.tasks, summary.updated.tasks],
    ["Milestones", summary.created.milestones, summary.updated.milestones],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="grid grid-cols-3 gap-2 border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        <span>Type</span><span className="text-right">Created</span><span className="text-right">Updated</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {rows.map(([label, created, updated]) => (
          <div key={label} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-right text-[var(--success)]">{created}</span>
            <span className="text-right text-[var(--primary)]">{updated}</span>
          </div>
        ))}
      </div>
      {summary.skipped > 0 ? <div className="border-t border-[var(--line)] px-4 py-2 text-sm text-[var(--muted)]">Skipped: {summary.skipped}</div> : null}
      {summary.warnings.length > 0 ? <div className="border-t border-[var(--line)] px-4 py-2 text-sm text-[var(--warning)]">Warnings: {summary.warnings.length}</div> : null}
    </div>
  );
}

export function RoadmapImportPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Array<{ path: string; message: string }> | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [pending, startTransition] = useTransition();

  function validate() {
    setError(null); setIssues(null); setPreview(null); setResult(null);
    startTransition(async () => {
      const res = await validateRoadmapAction(raw);
      if (!res.ok) { setError(res.error); setIssues(res.issues ?? null); return; }
      setPreview(res.summary);
    });
  }

  function importNow() {
    setError(null); setIssues(null); setResult(null);
    startTransition(async () => {
      const res = await importRoadmapAction(raw);
      if (!res.ok) { setError(res.error); setIssues(res.issues ?? null); return; }
      setResult(res.summary); setPreview(null); router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="border-b border-[var(--line)] pb-8">
        <div className="flex flex-wrap items-center gap-3"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]"><Map size={14} />Roadmap</p><Badge tone="primary" dot>Import</Badge></div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Import a master roadmap.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">Load a structured Goal → Year → Phase → Month → Week → Task hierarchy into your existing roadmap. Re-importing the same data updates it instead of duplicating it.</p>
      </header>

      <section className="mt-8 rounded-3xl border border-[var(--warning-soft)] bg-[var(--warning-tint)] p-5" aria-label="Import warning">
        <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 shrink-0 text-[var(--warning)]" size={18} aria-hidden="true" /><p className="text-sm leading-6 text-[var(--ink-soft)]">This will <strong>add or update</strong> roadmap data in your workspace. It never deletes or resets existing data. Validate first to preview what will be created.</p></div>
      </section>

      <section className="mt-6" aria-labelledby="input-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="input-heading" className="text-xl font-semibold tracking-[-0.03em]">Roadmap JSON</h2>
          <Button type="button" variant="ghost" onClick={() => setRaw(EXAMPLE)}><FileJson size={16} />Load example</Button>
        </div>
        <textarea value={raw} onChange={(event) => setRaw(event.target.value)} className="min-h-72 w-full rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 font-mono text-xs leading-6 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" placeholder='Paste roadmap JSON here, e.g. { "goal": {...}, "years": [...] }' spellCheck={false} />
        <p className="mt-2 text-xs text-[var(--muted)]">Maximum 512 KB. Each record needs a unique <code className="rounded bg-[var(--surface-muted)] px-1">importKey</code> for safe re-imports.</p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={validate} disabled={pending || !raw.trim()}>{pending ? "Validating..." : "Validate"}<Check size={16} /></Button>
        <Button type="button" onClick={importNow} disabled={pending || !raw.trim()}>{pending ? "Importing..." : "Import roadmap"}<Download size={16} /></Button>
      </div>

      {error ? <div className="mt-6 flex items-start gap-2 rounded-2xl bg-[var(--danger-tint)] p-4 text-sm text-[var(--danger)]" role="alert"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div> : null}

      {issues && issues.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--danger-soft)] bg-[var(--surface)] p-4" role="alert">
          <p className="text-sm font-semibold text-[var(--danger)]">Validation errors ({issues.length})</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ink-soft)]">
            {issues.slice(0, 20).map((issue, index) => <li key={index}><span className="font-mono text-xs text-[var(--muted)]">{issue.path}</span> — {issue.message}</li>)}
          </ul>
          {issues.length > 20 ? <p className="mt-2 text-xs text-[var(--muted)]">…and {issues.length - 20} more.</p> : null}
        </div>
      ) : null}

      {preview ? (
        <section className="mt-6 rounded-3xl border border-[var(--primary-soft)] bg-[var(--surface)] p-6" aria-labelledby="preview-heading">
          <div className="flex items-center gap-2"><Check className="text-[var(--success)]" size={18} aria-hidden="true" /><h2 id="preview-heading" className="text-xl font-semibold tracking-[-0.03em]">Ready to import</h2></div>
          <p className="mt-2 text-sm text-[var(--muted)]">The roadmap is valid. The following records would be created on import.</p>
          <div className="mt-4"><SummaryBlock summary={preview} /></div>
        </section>
      ) : null}

      {result ? (
        <section className="mt-6 rounded-3xl border border-[var(--success-soft)] bg-[var(--success-tint)] p-6" aria-labelledby="result-heading">
          <div className="flex items-center gap-2"><Check className="text-[var(--success)]" size={18} aria-hidden="true" /><h2 id="result-heading" className="text-xl font-semibold tracking-[-0.03em]">Roadmap imported successfully.</h2></div>
          <div className="mt-4"><SummaryBlock summary={result} /></div>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/roadmap" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open roadmap <ArrowRight size={16} /></Link><Link href="/planning" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--primary-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">Open planning <ArrowRight size={16} /></Link></div>
        </section>
      ) : null}

      <footer className="mt-8 flex items-center gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]"><ShieldCheck size={15} aria-hidden="true" />Import requires an authenticated, authorized device. Ownership is always assigned server-side.</footer>
    </div>
  );
}
