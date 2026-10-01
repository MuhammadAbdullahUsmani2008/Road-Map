"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Compass,
  Edit3,
  Flame,
  Lightbulb,
  Megaphone,
  Plus,
  RefreshCcw,
  Shield,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createCommitmentAction,
  deleteCommitmentAction,
  setCommitmentStatusAction,
  updateCommitmentAction,
} from "@/app/actions/commitment-actions";
import {
  createMotivationItemAction,
  deleteMotivationItemAction,
  toggleMotivationItemAction,
  updateMotivationItemAction,
} from "@/app/actions/motivation-actions";
import { markLiveMotivationShownAction, refreshLiveMotivationAction } from "@/app/actions/live-motivation-actions";
import { EmptyState } from "@/components/feedback/feedback-patterns";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { Commitment, MotivationData, MotivationItem } from "./motivation-data";
import { isCacheStale, selectDailyLiveMotivation } from "./live-motivation-utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const kindConfig: Record<MotivationItem["kind"], { label: string; tone: "primary" | "violet" | "warning" | "success"; icon: typeof Lightbulb }> = {
  principle: { label: "Principle", tone: "primary", icon: Compass },
  reminder: { label: "Reminder", tone: "violet", icon: Lightbulb },
  recovery: { label: "Recovery", tone: "warning", icon: Shield },
  note: { label: "Note", tone: "success", icon: Megaphone },
};

const cadenceLabels: Record<Commitment["cadence"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  one_time: "One-time",
};

const statusConfig: Record<Commitment["status"], { label: string; tone: "success" | "warning" | "neutral" | "primary" }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  completed: { label: "Completed", tone: "neutral" },
  archived: { label: "Archived", tone: "primary" },
};

// ─── Motivation Item Form ───────────────────────────────────────────────────

function MotivationItemForm({
  initial,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  initial: MotivationItem | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: { title: string; content: string; kind: string }) => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    kind: initial?.kind ?? "principle",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="motivation-form-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="primary">{initial ? "Edit Item" : "New Item"}</Badge>
            <h2 id="motivation-form-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {initial ? "Refine motivation item" : "Add a motivation item"}
            </h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close form"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            Title<span className="ml-1 text-[var(--danger)]">*</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="e.g. Protect the daily minimum above all else"
              required
              maxLength={160}
            />
          </label>
          <label className="block text-sm font-semibold">
            Content
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="The specific principle, reminder, or recovery guidance."
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Kind
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as MotivationItem["kind"] })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
            >
              <option value="principle">Principle</option>
              <option value="reminder">Reminder</option>
              <option value="recovery">Recovery</option>
              <option value="note">Note</option>
            </select>
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : initial ? "Save changes" : "Create item"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Commitment Form ────────────────────────────────────────────────────────

function CommitmentForm({
  initial,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  initial: Commitment | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: { title: string; description: string; cadence: string }) => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    cadence: initial?.cadence ?? "daily",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,26,51,0.5)] p-0 sm:items-center sm:p-6" role="presentation">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:max-w-xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="commitment-form-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="violet">{initial ? "Edit Commitment" : "New Commitment"}</Badge>
            <h2 id="commitment-form-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {initial ? "Refine commitment" : "Make a commitment"}
            </h2>
          </div>
          <IconButton onClick={onClose} aria-label="Close form"><X size={19} /></IconButton>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <label className="block text-sm font-semibold">
            Title<span className="ml-1 text-[var(--danger)]">*</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="e.g. Ship the first product listing"
              required
              maxLength={160}
            />
          </label>
          <label className="block text-sm font-semibold">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-2 min-h-24 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-3 text-sm font-normal outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]"
              placeholder="What does keeping this commitment look like in practice?"
              maxLength={2000}
            />
          </label>
          <label className="block text-sm font-semibold">
            Cadence
            <select
              value={form.cadence}
              onChange={(e) => setForm({ ...form, cadence: e.target.value as Commitment["cadence"] })}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
          </label>
          {error ? <p className="flex items-center gap-2 rounded-xl bg-[var(--danger-tint)] p-3 text-xs text-[var(--danger)]" role="alert"><CircleAlert size={15} />{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : initial ? "Save changes" : "Create commitment"}<Check size={16} /></Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function MotivationPage({ data }: { data: MotivationData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(data.error);
  const [success, setSuccess] = useState<string | null>(null);

  const [items, setItems] = useState<MotivationItem[]>(data.items);
  const [commitments, setCommitments] = useState<Commitment[]>(data.commitments);

  const [kindFilter, setKindFilter] = useState<"all" | MotivationItem["kind"]>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [itemModal, setItemModal] = useState<{ open: boolean; editing: MotivationItem | null }>({ open: false, editing: null });
  const [commitmentModal, setCommitmentModal] = useState<{ open: boolean; editing: Commitment | null }>({ open: false, editing: null });

  // Track whether we've recorded shown history for the current daily item
  const recordedShownRef = useRef<string | null>(null);

  // Record shown history when a live motivation item is actually displayed
  useEffect(() => {
    if (!data.liveMotivation.authenticated || data.liveMotivation.error || data.liveMotivation.items.length === 0) {
      recordedShownRef.current = null;
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const dailyItem = selectDailyLiveMotivation(data.liveMotivation.items, data.liveMotivation.shownHistory, today);

    if (!dailyItem) {
      recordedShownRef.current = null;
      return;
    }

    // Prevent duplicate calls for the same item on the same day
    const recordKey = `${dailyItem.id}:${today}`;
    if (recordedShownRef.current === recordKey) return;

    recordedShownRef.current = recordKey;
    markLiveMotivationShownAction(dailyItem.id, today).catch(() => {
      // Silently fail — shown history is best-effort
      // Reset ref to allow retry on next render
      recordedShownRef.current = null;
    });
  }, [data.liveMotivation.authenticated, data.liveMotivation.error, data.liveMotivation.items, data.liveMotivation.shownHistory]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showInactive && !item.isActive) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      return true;
    });
  }, [items, kindFilter, showInactive]);

  const activeCommitments = commitments.filter((c) => c.status === "active");
  const inactiveCommitments = commitments.filter((c) => c.status !== "active");

  // ─── Item Actions ───────────────────────────────────────────────────────

  function saveItem(form: { title: string; content: string; kind: string }) {
    setError(null);
    startTransition(async () => {
      const result = itemModal.editing
        ? await updateMotivationItemAction({ itemId: itemModal.editing.id, title: form.title, content: form.content, kind: form.kind })
        : await createMotivationItemAction({ title: form.title, content: form.content, kind: form.kind });
      if (!result.ok) { setError(result.error); return; }
      setItemModal({ open: false, editing: null });
      setSuccess(itemModal.editing ? "Item updated." : "Item created.");
      router.refresh();
    });
  }

  function toggleItem(item: MotivationItem) {
    setError(null);
    startTransition(async () => {
      const result = await toggleMotivationItemAction(item.id, !item.isActive);
      if (!result.ok) { setError(result.error); return; }
      setItems((current) => current.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
      setSuccess(item.isActive ? "Item deactivated." : "Item reactivated.");
    });
  }

  function deleteItem(item: MotivationItem) {
    setError(null);
    startTransition(async () => {
      const result = await deleteMotivationItemAction(item.id);
      if (!result.ok) { setError(result.error); return; }
      setItems((current) => current.filter((i) => i.id !== item.id));
      setSuccess("Item deleted.");
    });
  }

  // ─── Commitment Actions ─────────────────────────────────────────────────

  function saveCommitment(form: { title: string; description: string; cadence: string }) {
    setError(null);
    startTransition(async () => {
      const result = commitmentModal.editing
        ? await updateCommitmentAction({ commitmentId: commitmentModal.editing.id, title: form.title, description: form.description, cadence: form.cadence })
        : await createCommitmentAction({ title: form.title, description: form.description, cadence: form.cadence });
      if (!result.ok) { setError(result.error); return; }
      setCommitmentModal({ open: false, editing: null });
      setSuccess(commitmentModal.editing ? "Commitment updated." : "Commitment created.");
      router.refresh();
    });
  }

  function setCommitmentStatus(commitment: Commitment, status: Commitment["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await setCommitmentStatusAction(commitment.id, status);
      if (!result.ok) { setError(result.error); return; }
      setCommitments((current) => current.map((c) => c.id === commitment.id ? { ...c, status } : c));
      setSuccess(`Commitment ${status}.`);
    });
  }

  function deleteCommitment(commitment: Commitment) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommitmentAction(commitment.id);
      if (!result.ok) { setError(result.error); return; }
      setCommitments((current) => current.filter((c) => c.id !== commitment.id));
      setSuccess("Commitment deleted.");
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (!data.authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:px-12">
        <Badge tone="primary">Motivation</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Sign in to access your motivation system.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">Your motivation items and commitments are private to your authenticated workspace.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {/* Header */}
      <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              <Flame size={14} />Motivation & Commitment
            </p>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Principles that drive execution</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Define the operating principles, reminders, and commitments that keep your system aligned. These are not decorative quotes — they are the rules you execute by.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setItemModal({ open: true, editing: null })}>
            <Plus size={16} />Add Item
          </Button>
          <Button type="button" variant="secondary" onClick={() => setCommitmentModal({ open: true, editing: null })}>
            <Target size={16} />New Commitment
          </Button>
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

      {/* Active Commitment Banner */}
      {activeCommitments.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-[var(--primary-soft)] bg-[var(--primary-tint)] p-6 sm:p-7" aria-labelledby="active-commitment-heading">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
            <Target size={15} />Current Commitment
          </div>
          <h2 id="active-commitment-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {activeCommitments[0].title}
          </h2>
          {activeCommitments[0].description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">{activeCommitments[0].description}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone="primary">{cadenceLabels[activeCommitments[0].cadence]}</Badge>
            <Badge tone="success" dot>Active</Badge>
            <Link href="/today" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
              View in Today <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      ) : null}

      {/* Live Motivation Section */}
      <section className="mt-10" aria-labelledby="live-motivation-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="live-motivation-heading" className="text-2xl font-semibold tracking-[-0.04em]">Live Motivation</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Fresh motivational content from approved external sources.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await refreshLiveMotivationAction();
                if (!result.ok) { setError(result.error); return; }
                setSuccess(result.newItems && result.newItems > 0 ? `Fetched ${result.newItems} new item${result.newItems === 1 ? "" : "s"}.` : "No new content available.");
                router.refresh();
              });
            }}
            disabled={pending}
          >
            <RefreshCcw size={16} />Refresh
          </Button>
        </div>

        {!data.liveMotivation.authenticated ? null : data.liveMotivation.error ? (
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
            Live motivation is unavailable. Using your personal library instead.
          </div>
        ) : data.liveMotivation.items.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No live motivation cached yet"
              detail="Click Refresh to fetch fresh motivational content from approved sources."
            />
          </div>
        ) : (
          <div className="mt-4">
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const dailyItem = selectDailyLiveMotivation(data.liveMotivation.items, data.liveMotivation.shownHistory, today);
              if (!dailyItem) return <EmptyState title="No live motivation available" detail="All items have been shown. Check back later or refresh for new content." />;
              return (
                <article className="rounded-2xl border border-[var(--violet-soft)] bg-[var(--violet-tint)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Badge tone="violet">Fresh Motivation</Badge>
                      <p className="mt-3 text-base leading-7 text-[var(--ink)]">&ldquo;{dailyItem.content}&rdquo;</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                        {dailyItem.author ? <span className="font-semibold">— {dailyItem.author}</span> : null}
                        <span>Source: {dailyItem.source}</span>
                        {dailyItem.sourceUrl ? (
                          <a
                            href={dailyItem.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[var(--primary)] hover:underline"
                          >
                            View source
                          </a>
                        ) : null}
                        {dailyItem.publishedAt ? <span>Published: {new Date(dailyItem.publishedAt).toLocaleDateString()}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                    {isCacheStale(data.liveMotivation.lastFetchedAt) ? (
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />Cache stale — refresh recommended</span>
                    ) : (
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />Cache fresh</span>
                    )}
                    <span>·</span>
                    <span>{data.liveMotivation.items.length} item{data.liveMotivation.items.length === 1 ? "" : "s"} cached</span>
                  </div>
                </article>
              );
            })()}
          </div>
        )}
      </section>

      {/* Motivation Items Section */}
      <section className="mt-10" aria-labelledby="motivation-items-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="motivation-items-heading" className="text-2xl font-semibold tracking-[-0.04em]">Motivation Items</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Principles, reminders, recovery guidance, and notes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as "all" | MotivationItem["kind"])}
              className="min-h-10 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm font-normal outline-none focus:border-[var(--primary)]"
              aria-label="Filter by kind"
            >
              <option value="all">All kinds</option>
              <option value="principle">Principles</option>
              <option value="reminder">Reminders</option>
              <option value="recovery">Recovery</option>
              <option value="note">Notes</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--line-strong)]"
              />
              Show inactive
            </label>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={items.length === 0 ? "No motivation items yet" : "No items match your filter"}
              detail={items.length === 0 ? "Add your first principle, reminder, or recovery guidance to build your operating system." : "Try adjusting the filter or showing inactive items."}
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const config = kindConfig[item.kind];
              const Icon = config.icon;
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition ${item.isActive ? "border-[var(--line)]" : "border-dashed border-[var(--line-strong)] opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={config.tone}>
                        <Icon size={12} />{config.label}
                      </Badge>
                      {!item.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton onClick={() => setItemModal({ open: true, editing: item })} aria-label={`Edit ${item.title}`}>
                        <Edit3 size={15} />
                      </IconButton>
                      <IconButton onClick={() => toggleItem(item)} aria-label={item.isActive ? `Deactivate ${item.title}` : `Reactivate ${item.title}`}>
                        <RefreshCcw size={15} />
                      </IconButton>
                      <IconButton onClick={() => deleteItem(item)} aria-label={`Delete ${item.title}`}>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                  <h3 className="mt-3 text-base font-semibold tracking-[-0.02em]">{item.title}</h3>
                  {item.content ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.content}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Commitments Section */}
      <section className="mt-12" aria-labelledby="commitments-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="commitments-heading" className="text-2xl font-semibold tracking-[-0.04em]">Commitments</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Concrete commitments connected to execution.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setCommitmentModal({ open: true, editing: null })}>
            <Plus size={16} />New Commitment
          </Button>
        </div>

        {commitments.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No commitments yet"
              detail="Make a concrete commitment to connect your principles to daily execution."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Active commitments */}
            {activeCommitments.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--success)]">Active</p>
                {activeCommitments.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    pending={pending}
                    onEdit={() => setCommitmentModal({ open: true, editing: commitment })}
                    onSetStatus={(status) => setCommitmentStatus(commitment, status)}
                    onDelete={() => deleteCommitment(commitment)}
                  />
                ))}
              </div>
            ) : null}

            {/* Inactive commitments */}
            {inactiveCommitments.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">History</p>
                {inactiveCommitments.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    pending={pending}
                    onEdit={() => setCommitmentModal({ open: true, editing: commitment })}
                    onSetStatus={(status) => setCommitmentStatus(commitment, status)}
                    onDelete={() => deleteCommitment(commitment)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Modals */}
      {itemModal.open ? (
        <MotivationItemForm
          initial={itemModal.editing}
          pending={pending}
          error={error}
          onClose={() => setItemModal({ open: false, editing: null })}
          onSubmit={saveItem}
        />
      ) : null}
      {commitmentModal.open ? (
        <CommitmentForm
          initial={commitmentModal.editing}
          pending={pending}
          error={error}
          onClose={() => setCommitmentModal({ open: false, editing: null })}
          onSubmit={saveCommitment}
        />
      ) : null}
    </div>
  );
}

// ─── Commitment Card ────────────────────────────────────────────────────────

function CommitmentCard({
  commitment,
  pending,
  onEdit,
  onSetStatus,
  onDelete,
}: {
  commitment: Commitment;
  pending: boolean;
  onEdit: () => void;
  onSetStatus: (status: Commitment["status"]) => void;
  onDelete: () => void;
}) {
  const status = statusConfig[commitment.status];

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone} dot>{status.label}</Badge>
            <Badge tone="neutral">{cadenceLabels[commitment.cadence]}</Badge>
          </div>
          <h3 className="mt-2 text-base font-semibold tracking-[-0.02em]">{commitment.title}</h3>
          {commitment.description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{commitment.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {commitment.status === "active" ? (
            <>
              <Button type="button" variant="ghost" onClick={() => onSetStatus("completed")} disabled={pending} className="text-xs">
                <Check size={14} />Complete
              </Button>
              <Button type="button" variant="ghost" onClick={() => onSetStatus("paused")} disabled={pending} className="text-xs">
                Pause
              </Button>
            </>
          ) : null}
          {commitment.status === "paused" ? (
            <Button type="button" variant="ghost" onClick={() => onSetStatus("active")} disabled={pending} className="text-xs">
              <RefreshCcw size={14} />Resume
            </Button>
          ) : null}
          {commitment.status === "completed" || commitment.status === "archived" ? (
            <Button type="button" variant="ghost" onClick={() => onSetStatus("active")} disabled={pending} className="text-xs">
              <RefreshCcw size={14} />Reactivate
            </Button>
          ) : null}
          <IconButton onClick={onEdit} aria-label={`Edit ${commitment.title}`}>
            <Edit3 size={15} />
          </IconButton>
          <IconButton onClick={onDelete} aria-label={`Delete ${commitment.title}`}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
