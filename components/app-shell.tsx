"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Brain,
  CalendarCheck,
  CalendarRange,
  CheckSquare,
  FileText,
  Flame,
  LayoutDashboard,
  Map,
  Menu,
  MonitorPlay,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { navigationItems, utilityItems } from "@/config/navigation";
import { ThemeControl } from "@/components/theme-control";
import { IconButton } from "@/components/ui/button";

type AppShellProps = { children: ReactNode };

const iconMap = {
  Dashboard: LayoutDashboard,
  Today: CalendarCheck,
  Tasks: CheckSquare,
  Focus: Zap,
  Motivation: Flame,
  Roadmap: Map,
  Planning: CalendarRange,
  Reports: FileText,
  Intelligence: Brain,
  YouTube: MonitorPlay,
  Settings,
};

type NavigationLabel = keyof typeof iconMap;

function NavigationLink({ href, label }: { href: string; label: NavigationLabel }) {
  const pathname = usePathname();
  const Icon = iconMap[label];
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)] ${active ? "bg-[var(--sidebar-active)] text-[var(--ink)] shadow-[inset_3px_0_0_var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--ink)]"}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-[var(--primary)]" : "text-[var(--muted)] group-hover:text-[var(--primary)]"} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:flex">
      <header className="flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5" aria-label="USMANI OS home">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-bold tracking-[0.12em] text-white">U</span>
          <span className="text-sm font-bold tracking-[0.14em]">USMANI OS</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeControl />
          <IconButton onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
      </header>

      <aside className={`${open ? "block" : "hidden"} border-b border-[var(--line)] bg-[var(--sidebar)] lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r`}>
        <div className="hidden items-center justify-between px-6 py-7 lg:flex">
          <Link href="/" className="flex items-center gap-3" aria-label="USMANI OS home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-bold tracking-[0.16em] text-white">U</span>
            <span className="text-sm font-bold tracking-[0.16em]">USMANI OS</span>
          </Link>
        </div>
        <div className="hidden px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] lg:block">Build the system</div>

        <nav className="space-y-1 px-3 py-4 lg:flex-1 lg:py-5" aria-label="Primary navigation">
          {navigationItems.map((item) => <NavigationLink key={item.href} href={item.href} label={item.label as NavigationLabel} />)}
        </nav>

        <div className="border-t border-[var(--line)] px-3 py-4">
          {utilityItems.map((item) => <NavigationLink key={item.href} href={item.href} label={item.label as NavigationLabel} />)}
          <div className="mt-4 hidden items-center justify-between border-t border-[var(--line)] px-3 pt-4 lg:flex">
            <span className="flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden="true" />Ready to execute</span>
            <ThemeControl />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
