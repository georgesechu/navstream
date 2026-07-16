"use client";

import { useMemo } from "react";
import { useFetch } from "./use-fetch";

/**
 * Team member as returned by /api/team (includes joined site name).
 */
export interface ApiTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  siteId: string;
  siteName: string;
  status: string;
  avatar: string;
  tasksCompleted: number;
  streak: number;
  rating: number;
  badges: string[];
  recentActivity: number[];
  createdAt: string;
}

/**
 * Fallback contacts used when the API is unreachable.
 */
const fallbackContacts: ApiTeamMember[] = [
  {
    id: "c1",
    name: "James Mitchell",
    email: "james.mitchell@meridian-mining.com",
    role: "technician",
    siteId: "site-1",
    siteName: "Kalgoorlie Gold Mine",
    status: "online",
    avatar: "JM",
    tasksCompleted: 42,
    streak: 7,
    rating: 4.8,
    badges: [],
    recentActivity: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "c2",
    name: "Sarah Chen",
    email: "sarah.chen@meridian-mining.com",
    role: "engineer",
    siteId: "site-2",
    siteName: "Pilbara Iron Ore",
    status: "online",
    avatar: "SC",
    tasksCompleted: 35,
    streak: 5,
    rating: 4.6,
    badges: [],
    recentActivity: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "c3",
    name: "David Okonkwo",
    email: "david.okonkwo@meridian-mining.com",
    role: "technician",
    siteId: "site-3",
    siteName: "Broken Hill Processing",
    status: "online",
    avatar: "DO",
    tasksCompleted: 58,
    streak: 12,
    rating: 4.9,
    badges: [],
    recentActivity: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "c4",
    name: "Emma Torres",
    email: "emma.torres@meridian-mining.com",
    role: "safety-officer",
    siteId: "site-4",
    siteName: "Darwin LNG Terminal",
    status: "online",
    avatar: "ET",
    tasksCompleted: 21,
    streak: 3,
    rating: 4.5,
    badges: [],
    recentActivity: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "c5",
    name: "Alex Petrov",
    email: "alex.petrov@meridian-mining.com",
    role: "technician",
    siteId: "site-5",
    siteName: "Atacama Solar Farm",
    status: "offline",
    avatar: "AP",
    tasksCompleted: 15,
    streak: 0,
    rating: 4.2,
    badges: [],
    recentActivity: [],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Map DB status values to comms-friendly statuses.
 * DB stores "online" | "busy" | "offline", but comms page uses
 * "online" | "warning" | "offline" for status dot colors.
 */
function mapContactStatus(dbStatus: string): "online" | "warning" | "offline" {
  if (dbStatus === "online") return "online";
  if (dbStatus === "busy") return "warning";
  return "offline";
}

/**
 * Format a DB role string for display.
 */
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    engineer: "Site Engineer",
    technician: "Field Technician",
    "safety-officer": "Safety Officer",
    manager: "Operations Manager",
  };
  return roleLabels[role] || role;
}

export interface CommsContact {
  id: string;
  name: string;
  role: string;
  roleDisplay: string;
  site: string;
  siteId: string;
  status: "online" | "warning" | "offline";
  avatar: string;
}

/**
 * Fetches team members from /api/team and maps them to comms contacts.
 * Falls back to hardcoded data if API is unavailable.
 * Optionally prioritizes a specific site (showing those contacts first).
 */
export function useTeam(prioritySiteId?: string | null) {
  const { data, isLoading, error } = useFetch<ApiTeamMember[]>("/api/team");

  const members = useMemo((): ApiTeamMember[] => {
    if (data && data.length > 0) return data;
    if (error) return fallbackContacts;
    return data ?? fallbackContacts;
  }, [data, error]);

  const contacts = useMemo((): CommsContact[] => {
    return members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      roleDisplay: formatRole(m.role),
      site: m.siteName,
      siteId: m.siteId,
      status: mapContactStatus(m.status),
      avatar: m.avatar,
    }));
  }, [members]);

  const sortedContacts = useMemo((): CommsContact[] => {
    if (!prioritySiteId) return contacts;
    const siteContacts = contacts.filter((c) => c.siteId === prioritySiteId);
    const otherContacts = contacts.filter((c) => c.siteId !== prioritySiteId);
    return [...siteContacts, ...otherContacts];
  }, [contacts, prioritySiteId]);

  const siteTeamCount = useMemo(() => {
    if (!prioritySiteId) return 0;
    return contacts.filter((c) => c.siteId === prioritySiteId).length;
  }, [contacts, prioritySiteId]);

  const onlineCount = useMemo(
    () => contacts.filter((c) => c.status === "online").length,
    [contacts]
  );

  return {
    contacts: sortedContacts,
    onlineCount,
    siteTeamCount,
    isLoading,
    error,
    isFromApi: data !== null && !error,
  };
}
