"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bot,
  CalendarRange,
  ChartSpline,
  Database,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  type?: "route" | "anchor";
};

const navItems: NavItem[] = [
  { label: "Painel", icon: LayoutDashboard, href: "/", type: "route" },
  { label: "Projetos", icon: FolderKanban, href: "/#projects", type: "anchor" },
  { label: "Insights", icon: Sparkles, href: "/#insights", type: "anchor" },
  { label: "Sprints", icon: Workflow, href: "/#sprints", type: "anchor" },
{ label: "Reuniões", icon: CalendarRange, href: "/meetings", type: "route" },
  { label: "Playbooks", icon: Bot, href: "/#playbooks", type: "anchor" },
  { label: "Governança", icon: BadgeCheck, href: "/#governance", type: "anchor" },
  { label: "Admin", icon: Settings2, href: "/admin", type: "route" },
];

const bottomLinks: NavItem[] = [
  { label: "Knowledge Base", icon: LifeBuoy, href: "/#support", type: "anchor" },
  { label: "Data Lineage", icon: Database, href: "/#lineage", type: "anchor" },
  { label: "Analytics", icon: ChartSpline, href: "/#analytics", type: "anchor" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-64 flex-col border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/70 px-6 py-8 text-slate-200 shadow-xl">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 shadow-[0_0_35px_-12px_rgba(16,185,129,0.7)]">
          <Sparkles className="h-6 w-6 text-slate-950" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-200/80">Pulse</p>
          <h1 className="text-xl font-semibold text-white">PulseHub</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400/70">Navegação</p>
            <div className="mt-3 space-y-1">
              {navItems.map((item) => {
                const active =
                  item.type === "route"
                    ? item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                    : false;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-white/10 text-white shadow-[0_0_20px_-10px_rgba(59,130,246,0.8)]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 text-emerald-300/90 transition group-hover:scale-110" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400/70">Ops & Analytics</p>
            <div className="mt-3 space-y-1">
              {bottomLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <item.icon className="h-4 w-4 text-cyan-200" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </ScrollArea>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-emerald-400/60">
            <AvatarFallback className="bg-emerald-500/20 text-emerald-200">IF</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white">Isabelle França</p>
            <p className="text-xs text-emerald-200/70">Product Leader · Aurora</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-300/80">
          <p className="flex items-center justify-between">
            <span>Planos ativos</span>
            <span className="font-semibold text-emerald-200">Enterprise</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Tokens IA</span>
            <span className="font-semibold text-emerald-200">72k / mês</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
