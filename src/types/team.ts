import type { TeamMemberId, SiteId, Timestamp } from "./common";

export type TeamRole = "admin" | "engineer" | "technician" | "safety-officer" | "manager";
export type TeamMemberStatus = "online" | "busy" | "offline";

export interface TeamMember {
  id: TeamMemberId;
  name: string;
  email: string;
  role: TeamRole;
  siteId: SiteId;
  status: TeamMemberStatus;
  avatar: string; // initials
  tasksCompleted: number;
  streak: number;
  rating: number;
  badges: string[];
  recentActivity: number[]; // last N periods of task counts
  createdAt: Timestamp;
}
