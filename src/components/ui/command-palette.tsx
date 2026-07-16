"use client";

import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  Map,
  Radio,
  Camera,
  Thermometer,
  Video,
  BrainCircuit,
  BarChart3,
  Bell,
  Users,
  Settings,
  MapPin,
  ArrowRight,
  Command,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Globe;
  href?: string;
  action?: () => void;
  category: string;
  accent?: string;
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, sites } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-map", label: "Command Map", icon: Globe, href: "/dashboard", category: "Navigation", accent: "cyan" },
    { id: "nav-sites", label: "Sites", icon: Map, href: "/sites", category: "Navigation", accent: "cyan" },
    { id: "nav-feeds", label: "Live Feeds", icon: Radio, href: "/feeds", category: "Navigation", accent: "green" },
    { id: "nav-viewer", label: "360° Viewer", icon: Camera, href: "/viewer", category: "Navigation", accent: "magenta" },
    { id: "nav-imaging", label: "Imaging", icon: Thermometer, href: "/imaging", category: "Navigation", accent: "amber" },
    { id: "nav-comms", label: "Communications", icon: Video, href: "/comms", category: "Navigation", accent: "green" },
    { id: "nav-ai", label: "AI Assistant", icon: BrainCircuit, href: "/ai", category: "Navigation", accent: "magenta" },
    { id: "nav-analytics", label: "Analytics", icon: BarChart3, href: "/analytics", category: "Navigation", accent: "cyan" },
    { id: "nav-alerts", label: "Alerts", icon: Bell, href: "/alerts", category: "Navigation", accent: "amber" },
    { id: "nav-team", label: "Team", icon: Users, href: "/team", category: "Navigation", accent: "cyan" },
    { id: "nav-settings", label: "Settings", icon: Settings, href: "/settings", category: "Navigation", accent: "cyan" },
    // Sites
    ...sites.map((site) => ({
      id: `site-${site.id}`,
      label: site.name,
      description: `${site.type} · ${site.status}`,
      icon: MapPin,
      href: `/sites/${site.id}`,
      category: "Sites",
      accent: site.status === "online" ? "green" : site.status === "warning" ? "amber" : site.status === "critical" ? "red" : "muted",
    })),
  ];

  const filtered = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const grouped = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  const flatFiltered = Object.values(grouped).flat();

  const executeCommand = useCallback((cmd: CommandItem) => {
    if (cmd.href) router.push(cmd.href);
    if (cmd.action) cmd.action();
    setCommandPaletteOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, [router, setCommandPaletteOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
      executeCommand(flatFiltered[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setCommandPaletteOpen(false);
              setQuery("");
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <div role="dialog" aria-label="Command palette" data-testid="command-palette" className="rounded-2xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] shadow-[0_25px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--nav-border)]">
                <Search className="w-4.5 h-4.5 text-[var(--nav-text-muted)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands, sites, equipment..."
                  data-testid="command-palette-input"
                  className="flex-1 bg-transparent text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] outline-none"
                />
                <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] text-[10px] text-[var(--nav-text-muted)]">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto p-2">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <p className="text-[10px] font-semibold text-[var(--nav-text-muted)] uppercase tracking-wider px-2 py-1.5">
                      {category}
                    </p>
                    {items.map((cmd) => {
                      const globalIndex = flatFiltered.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      const accentIconColors: Record<string, string> = {
                        cyan: "text-cyan",
                        green: "text-green",
                        amber: "text-amber",
                        magenta: "text-magenta",
                        red: "text-red",
                        muted: "text-[var(--nav-text-muted)]",
                      };

                      return (
                        <button
                          key={cmd.id}
                          data-testid={`command-palette-result-${cmd.id}`}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            isSelected
                              ? "bg-cyan/10 text-cyan"
                              : "text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)]"
                          )}
                        >
                          <cmd.icon
                            className={cn(
                              "w-4 h-4 flex-shrink-0",
                              isSelected ? "text-cyan" : accentIconColors[cmd.accent || "cyan"]
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{cmd.label}</p>
                            {cmd.description && (
                              <p className="text-[10px] text-[var(--nav-text-muted)] truncate">
                                {cmd.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-3.5 h-3.5 text-cyan" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {flatFiltered.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--nav-text-muted)]">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--nav-border)] bg-[var(--nav-bg-primary)]/50">
                <div className="flex items-center gap-3 text-[10px] text-[var(--nav-text-muted)]">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-[var(--nav-bg-primary)] border border-[var(--nav-border)]">
                      ↑↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-[var(--nav-bg-primary)] border border-[var(--nav-border)]">
                      ↵
                    </kbd>
                    Select
                  </span>
                </div>
                <span className="text-[10px] text-[var(--nav-text-muted)]">
                  {flatFiltered.length} results
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
