"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Map,
  Radio,
  Camera,
  Thermometer,
  Video,
  BrainCircuit,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Users,
  BarChart3,
} from "lucide-react";
import { NavStreamWordmark } from "@/components/ui/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Command Map",
    icon: Globe,
    href: "/dashboard",
    accent: "cyan",
  },
  {
    label: "Sites",
    icon: Map,
    href: "/sites",
    accent: "cyan",
  },
  {
    label: "Live Feeds",
    icon: Radio,
    href: "/feeds",
    accent: "green",
  },
  {
    label: "360° Viewer",
    icon: Camera,
    href: "/viewer",
    accent: "magenta",
  },
  {
    label: "Imaging",
    icon: Thermometer,
    href: "/imaging",
    accent: "amber",
  },
  {
    label: "Comms",
    icon: Video,
    href: "/comms",
    accent: "green",
  },
  {
    label: "AI Assist",
    icon: BrainCircuit,
    href: "/ai",
    accent: "magenta",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    accent: "cyan",
  },
] as const;

const bottomItems = [
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Team", icon: Users, href: "/team" },
  { label: "Settings", icon: Settings, href: "/settings" },
] as const;

const accentColors: Record<string, string> = {
  cyan: "text-cyan group-hover:text-cyan group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]",
  green:
    "text-green group-hover:text-green group-hover:drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]",
  amber:
    "text-amber group-hover:text-amber group-hover:drop-shadow-[0_0_8px_rgba(255,171,0,0.5)]",
  magenta:
    "text-magenta group-hover:text-magenta group-hover:drop-shadow-[0_0_8px_rgba(224,64,251,0.5)]",
};

const activeAccentColors: Record<string, string> = {
  cyan: "text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]",
  green: "text-green drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]",
  amber: "text-amber drop-shadow-[0_0_8px_rgba(255,171,0,0.5)]",
  magenta: "text-magenta drop-shadow-[0_0_8px_rgba(224,64,251,0.5)]",
};

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col",
        "bg-[var(--nav-bg-secondary)] border-r border-[var(--nav-border)]",
        "select-none"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-[var(--nav-border)]">
        <NavStreamWordmark collapsed={sidebarCollapsed} />
      </div>

      {/* Main nav */}
      <nav role="navigation" aria-label="Main navigation" data-testid="sidebar-nav" className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const accent = item.accent || "cyan";

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`sidebar-nav-${item.href === "/dashboard" ? "home" : item.href.slice(1)}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150",
                "hover:bg-[var(--nav-bg-hover)]",
                isActive && "bg-[var(--nav-bg-hover)]"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-all duration-150",
                  isActive
                    ? activeAccentColors[accent]
                    : cn("text-[var(--nav-text-muted)]", accentColors[accent])
                )}
              />

              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.1 }}
                    className={cn(
                      "text-sm font-medium truncate transition-colors",
                      isActive
                        ? "text-[var(--nav-text-primary)]"
                        : "text-[var(--nav-text-secondary)] group-hover:text-[var(--nav-text-primary)]"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 px-2 py-2 border-t border-[var(--nav-border)]">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`sidebar-nav-${item.href.slice(1)}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150",
                "hover:bg-[var(--nav-bg-hover)]",
                isActive && "bg-[var(--nav-bg-hover)]"
              )}
            >
              <item.icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-[var(--nav-text-primary)]"
                    : "text-[var(--nav-text-muted)] group-hover:text-[var(--nav-text-secondary)]"
                )}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "text-sm truncate transition-colors",
                      isActive
                        ? "text-[var(--nav-text-primary)]"
                        : "text-[var(--nav-text-secondary)] group-hover:text-[var(--nav-text-primary)]"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          data-testid="sidebar-collapse-btn"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)] transition-all duration-150"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4.5 h-4.5 flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-4.5 h-4.5 flex-shrink-0" />
          )}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
