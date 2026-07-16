"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Users,
  MapPin,
  Phone,
  Mail,
  Shield,
  Star,
  Trophy,
  Flame,
  Award,
  Search,
  Loader2,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import type { ApiTeamMember } from "@/hooks/use-team";

const mockTeam = [
  {
    id: "t1",
    name: "James Mitchell",
    role: "Lead Technician",
    site: "Kalgoorlie Gold Mine",
    status: "online" as const,
    avatar: "JM",
    tasksCompleted: 142,
    streak: 14,
    rating: 4.9,
    recentActivity: [8, 12, 10, 15, 9, 11, 14, 16, 13, 12, 15, 18],
    badges: ["Top Performer", "Zero Downtime"],
  },
  {
    id: "t2",
    name: "Sarah Chen",
    role: "Site Engineer",
    site: "Pilbara Iron Ore",
    status: "online" as const,
    avatar: "SC",
    tasksCompleted: 98,
    streak: 7,
    rating: 4.7,
    recentActivity: [6, 8, 7, 10, 12, 9, 8, 11, 10, 9, 12, 14],
    badges: ["Quick Responder"],
  },
  {
    id: "t3",
    name: "David Okonkwo",
    role: "Maintenance Lead",
    site: "Broken Hill Processing",
    status: "warning" as const,
    avatar: "DO",
    tasksCompleted: 167,
    streak: 21,
    rating: 4.8,
    recentActivity: [10, 14, 12, 16, 18, 15, 13, 17, 19, 16, 14, 20],
    badges: ["Top Performer", "Mentor", "Safety Champion"],
  },
  {
    id: "t4",
    name: "Emma Torres",
    role: "Safety Officer",
    site: "Darwin LNG Terminal",
    status: "online" as const,
    avatar: "ET",
    tasksCompleted: 89,
    streak: 5,
    rating: 4.6,
    recentActivity: [5, 7, 6, 8, 7, 9, 8, 10, 9, 7, 8, 11],
    badges: ["Safety Champion"],
  },
  {
    id: "t5",
    name: "Alex Petrov",
    role: "Field Technician",
    site: "Atacama Solar Farm",
    status: "offline" as const,
    avatar: "AP",
    tasksCompleted: 54,
    streak: 0,
    rating: 4.3,
    recentActivity: [4, 5, 6, 4, 7, 5, 6, 8, 3, 5, 0, 0],
    badges: [],
  },
  {
    id: "t6",
    name: "Li Wei",
    role: "Network Engineer",
    site: "Svalbard Data Center",
    status: "offline" as const,
    avatar: "LW",
    tasksCompleted: 76,
    streak: 0,
    rating: 4.5,
    recentActivity: [7, 9, 8, 10, 11, 8, 9, 12, 0, 0, 0, 0],
    badges: ["Quick Responder"],
  },
];

/**
 * Map DB role strings to display-friendly labels.
 */
const roleLabels: Record<string, string> = {
  admin: "Administrator",
  engineer: "Site Engineer",
  technician: "Field Technician",
  "safety-officer": "Safety Officer",
  manager: "Operations Manager",
};

/**
 * Map DB status to the status values the team page uses.
 */
function mapTeamStatus(dbStatus: string): "online" | "warning" | "offline" {
  if (dbStatus === "online") return "online";
  if (dbStatus === "busy") return "warning";
  return "offline";
}

type TeamDisplayMember = typeof mockTeam[number];

const badgeIcons: Record<string, { icon: typeof Star; color: string }> = {
  "Top Performer": { icon: Trophy, color: "text-amber" },
  "Zero Downtime": { icon: Shield, color: "text-green" },
  "Quick Responder": { icon: Flame, color: "text-magenta" },
  Mentor: { icon: Star, color: "text-cyan" },
  "Safety Champion": { icon: Award, color: "text-green" },
};

export default function TeamPage() {
  const { data: apiTeam, isLoading, error } = useFetch<ApiTeamMember[]>("/api/team");

  // Map API data to the display shape, falling back to mockTeam
  const team = useMemo((): TeamDisplayMember[] => {
    if (apiTeam && apiTeam.length > 0) {
      return apiTeam.map((m) => ({
        id: m.id,
        name: m.name,
        role: roleLabels[m.role] || m.role,
        site: m.siteName,
        status: mapTeamStatus(m.status),
        avatar: m.avatar,
        tasksCompleted: m.tasksCompleted,
        streak: m.streak,
        rating: Number(m.rating),
        recentActivity: m.recentActivity && m.recentActivity.length > 0
          ? m.recentActivity
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        badges: m.badges ?? [],
      }));
    }
    return mockTeam;
  }, [apiTeam]);

  const onlineCount = team.filter((t) => t.status === "online").length;

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Team"
          subtitle={`${onlineCount} online · ${team.length} members`}
          accent="cyan"
          actions={
            <button className="px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan text-xs font-medium border border-cyan/20 hover:bg-cyan/20 transition-colors">
              + Invite Member
            </button>
          }
        />

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--nav-bg-secondary)] border border-[var(--nav-border)] max-w-md">
          <Search className="w-4 h-4 text-[var(--nav-text-muted)]" />
          <input
            type="text"
            placeholder="Search team members..."
            data-testid="team-search-input"
            className="flex-1 bg-transparent text-sm text-[var(--nav-text-primary)] placeholder:text-[var(--nav-text-muted)] outline-none"
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-cyan animate-spin" />
            <span className="ml-2 text-sm text-[var(--nav-text-muted)]">Loading team...</span>
          </div>
        )}

        {/* Leaderboard bar */}
        {!isLoading && <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-gradient-to-r from-amber/5 via-[var(--nav-bg-secondary)] to-amber/5 border border-amber/20">
          <Trophy className="w-5 h-5 text-amber" />
          <div className="flex items-center gap-6">
            {[...team]
              .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
              .slice(0, 3)
              .map((member, i) => (
                <div key={member.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber font-mono">
                    #{i + 1}
                  </span>
                  <span className="text-xs text-[var(--nav-text-primary)]">
                    {member.name}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--nav-text-muted)]">
                    {member.tasksCompleted} tasks
                  </span>
                </div>
              ))}
          </div>
        </div>}

        {/* Team grid */}
        {!isLoading && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {team.map((member, i) => {
            const statusColor =
              member.status === "online"
                ? "bg-green"
                : member.status === "warning"
                  ? "bg-amber"
                  : "bg-[var(--nav-text-muted)]";

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                data-testid={`team-member-${member.id}`}
                className="rounded-xl border border-[var(--nav-border)] bg-[var(--nav-bg-secondary)] p-4 hover:border-cyan/20 hover:shadow-[0_0_20px_rgba(0,229,255,0.05)] transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-dim/30 to-magenta/30 flex items-center justify-center border border-[var(--nav-border)]">
                      <span className="text-lg font-bold text-[var(--nav-text-primary)]">
                        {member.avatar}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--nav-bg-secondary)]",
                        statusColor
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--nav-text-primary)] group-hover:text-cyan transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-[11px] text-[var(--nav-text-muted)]">
                      {member.role}
                    </p>
                    <p className="text-[10px] text-[var(--nav-text-muted)] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {member.site}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button data-testid={`team-member-${member.id}-call-btn`} aria-label={`Call ${member.name}`} className="p-1.5 rounded-lg hover:bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)] transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button data-testid={`team-member-${member.id}-email-btn`} aria-label={`Email ${member.name}`} className="p-1.5 rounded-lg hover:bg-[var(--nav-bg-hover)] text-[var(--nav-text-muted)] transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-lg font-bold font-mono text-[var(--nav-text-primary)]">
                      {member.tasksCompleted}
                    </p>
                    <p className="text-[9px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                      Tasks
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-amber flex items-center gap-1">
                      {member.streak > 0 && (
                        <Flame className="w-3.5 h-3.5" />
                      )}
                      {member.streak}
                    </p>
                    <p className="text-[9px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                      Streak
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-green flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {member.rating}
                    </p>
                    <p className="text-[9px] text-[var(--nav-text-muted)] uppercase tracking-wider">
                      Rating
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Sparkline
                      data={member.recentActivity}
                      width={100}
                      height={30}
                      accent="cyan"
                      delay={0.3 + i * 0.05}
                    />
                  </div>
                </div>

                {/* Badges */}
                {member.badges.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {member.badges.map((badge) => {
                      const badgeInfo = badgeIcons[badge] || {
                        icon: Award,
                        color: "text-[var(--nav-text-muted)]",
                      };
                      const BadgeIcon = badgeInfo.icon;
                      return (
                        <span
                          key={badge}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--nav-bg-tertiary)] border border-[var(--nav-border-subtle)] text-[10px]"
                        >
                          <BadgeIcon
                            className={cn("w-2.5 h-2.5", badgeInfo.color)}
                          />
                          <span className="text-[var(--nav-text-secondary)]">
                            {badge}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>}
      </div>
    </AppShell>
  );
}
