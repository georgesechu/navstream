import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers, sites } from "@/db/schema";

export async function GET() {
  try {
    const result = await db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        email: teamMembers.email,
        role: teamMembers.role,
        siteId: teamMembers.siteId,
        siteName: sites.name,
        status: teamMembers.status,
        avatar: teamMembers.avatar,
        tasksCompleted: teamMembers.tasksCompleted,
        streak: teamMembers.streak,
        rating: teamMembers.rating,
        badges: teamMembers.badges,
        recentActivity: teamMembers.recentActivity,
        createdAt: teamMembers.createdAt,
      })
      .from(teamMembers)
      .innerJoin(sites, eq(teamMembers.siteId, sites.id));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
