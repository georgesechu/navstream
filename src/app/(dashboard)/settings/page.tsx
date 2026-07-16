"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Monitor,
  Volume2,
  ChevronRight,
  Check,
} from "lucide-react";
import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "audio", label: "Audio & Alerts", icon: Volume2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Database },
  { id: "api", label: "API Keys", icon: Key },
  { id: "display", label: "Display", icon: Monitor },
  { id: "region", label: "Region & Language", icon: Globe },
];

function ToggleSwitch({
  enabled,
  onToggle,
  accent = "cyan",
  "data-testid": testId,
}: {
  enabled: boolean;
  onToggle: () => void;
  accent?: string;
  "data-testid"?: string;
}) {
  const accentBg: Record<string, string> = {
    cyan: "bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]",
    green: "bg-green shadow-[0_0_8px_rgba(0,230,118,0.3)]",
    amber: "bg-amber shadow-[0_0_8px_rgba(255,171,0,0.3)]",
    magenta: "bg-magenta shadow-[0_0_8px_rgba(224,64,251,0.3)]",
  };

  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      data-testid={testId}
      className={cn(
        "relative w-10 h-5.5 rounded-full transition-colors",
        enabled ? accentBg[accent] || accentBg.cyan : "bg-[var(--nav-bg-hover)]"
      )}
    >
      <motion.div
        className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
        animate={{ left: enabled ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
  delay = 0,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between py-3 border-b border-[var(--nav-border-subtle)] last:border-b-0"
    >
      <div>
        <p className="text-sm text-[var(--nav-text-primary)]">{label}</p>
        {description && (
          <p className="text-[11px] text-[var(--nav-text-muted)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("appearance");
  const { settings, toggle } = useSettings();

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Settings"
          subtitle="Customize your NavStream experience"
          accent="cyan"
        />

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <div className="w-56 flex-shrink-0">
            <div className="flex flex-col gap-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  data-testid={`settings-section-${section.id}`}
                  aria-pressed={activeSection === section.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm",
                    activeSection === section.id
                      ? "bg-cyan/10 text-cyan border border-cyan/20"
                      : "text-[var(--nav-text-secondary)] hover:bg-[var(--nav-bg-hover)] hover:text-[var(--nav-text-primary)] border border-transparent"
                  )}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl">
            {activeSection === "appearance" && (
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-6">
                <h2 className="text-sm font-semibold text-[var(--nav-text-primary)] mb-4">
                  Appearance
                </h2>

                <SettingRow
                  label="Glow Effects"
                  description="Neon glow on accent elements and status indicators"
                  delay={0.05}
                >
                  <ToggleSwitch
                    enabled={settings.glowEffects}
                    onToggle={() => toggle("glowEffects")}
                    data-testid="settings-toggle-glowEffects"
                  />
                </SettingRow>

                <SettingRow
                  label="Animations"
                  description="Smooth transitions and motion effects"
                  delay={0.1}
                >
                  <ToggleSwitch
                    enabled={settings.animations}
                    onToggle={() => toggle("animations")}
                    data-testid="settings-toggle-animations"
                  />
                </SettingRow>

                <SettingRow
                  label="Scanline Overlay"
                  description="CRT-style scanlines on video feeds for that retro look"
                  delay={0.15}
                >
                  <ToggleSwitch
                    enabled={settings.scanlines}
                    onToggle={() => toggle("scanlines")}
                    accent="magenta"
                    data-testid="settings-toggle-scanlines"
                  />
                </SettingRow>

                <SettingRow
                  label="Compact Mode"
                  description="Reduce padding and spacing for more data density"
                  delay={0.2}
                >
                  <ToggleSwitch
                    enabled={settings.compactMode}
                    onToggle={() => toggle("compactMode")}
                    data-testid="settings-toggle-compactMode"
                  />
                </SettingRow>

                <SettingRow
                  label="Dark Satellite Basemap"
                  description="Use dark satellite imagery on Command Map"
                  delay={0.25}
                >
                  <ToggleSwitch
                    enabled={settings.darkSatellite}
                    onToggle={() => toggle("darkSatellite")}
                    accent="green"
                    data-testid="settings-toggle-darkSatellite"
                  />
                </SettingRow>

                <h2 className="text-sm font-semibold text-[var(--nav-text-primary)] mt-6 mb-4">
                  Accent Color
                </h2>
                <div className="flex gap-3">
                  {[
                    { color: "#00e5ff", name: "Cyan" },
                    { color: "#e040fb", name: "Magenta" },
                    { color: "#00e676", name: "Green" },
                    { color: "#ffab00", name: "Amber" },
                    { color: "#ff1744", name: "Red" },
                  ].map((c) => (
                    <button
                      key={c.name}
                      data-testid={`settings-accent-${c.name.toLowerCase()}`}
                      aria-label={`Set accent color to ${c.name}`}
                      aria-pressed={c.name === "Cyan"}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          c.name === "Cyan"
                            ? "border-white scale-110"
                            : "border-transparent hover:border-white/30 hover:scale-105"
                        )}
                        style={{
                          backgroundColor: c.color,
                          boxShadow:
                            c.name === "Cyan"
                              ? `0 0 12px ${c.color}40`
                              : "none",
                        }}
                      >
                        {c.name === "Cyan" && (
                          <Check className="w-4 h-4 text-white m-auto mt-1.5" />
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--nav-text-muted)]">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "audio" && (
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-6">
                <h2 className="text-sm font-semibold text-[var(--nav-text-primary)] mb-4">
                  Audio & Alert Sounds
                </h2>

                <SettingRow
                  label="Sound Effects"
                  description="Play audio cues for alerts and notifications"
                  delay={0.05}
                >
                  <ToggleSwitch
                    enabled={settings.sound}
                    onToggle={() => toggle("sound")}
                    accent="green"
                    data-testid="settings-toggle-sound"
                  />
                </SettingRow>

                <SettingRow
                  label="Push Notifications"
                  description="Browser notifications for alerts"
                  delay={0.1}
                >
                  <ToggleSwitch
                    enabled={settings.notifications}
                    onToggle={() => toggle("notifications")}
                    accent="green"
                    data-testid="settings-toggle-notifications"
                  />
                </SettingRow>

                <SettingRow
                  label="Critical Alert Override"
                  description="Always play sound for critical alerts even when muted"
                  delay={0.15}
                >
                  <ToggleSwitch
                    enabled={settings.criticalAlerts}
                    onToggle={() => toggle("criticalAlerts")}
                    accent="amber"
                    data-testid="settings-toggle-criticalAlerts"
                  />
                </SettingRow>

                <SettingRow
                  label="Auto-refresh Feeds"
                  description="Automatically refresh camera feeds and sensor data"
                  delay={0.2}
                >
                  <ToggleSwitch
                    enabled={settings.autoRefresh}
                    onToggle={() => toggle("autoRefresh")}
                    data-testid="settings-toggle-autoRefresh"
                  />
                </SettingRow>
              </div>
            )}

            {activeSection !== "appearance" && activeSection !== "audio" && (
              <div className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-12 flex flex-col items-center justify-center gap-3">
                <Settings className="w-8 h-8 text-[var(--nav-text-muted)]" />
                <p className="text-sm text-[var(--nav-text-muted)]">
                  {sections.find((s) => s.id === activeSection)?.label} settings
                  — coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
