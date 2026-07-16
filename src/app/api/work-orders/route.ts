import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { workOrders, sites, equipment, teamMembers } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const siteId = searchParams.get("siteId");

    const conditions = [];
    if (status) {
      conditions.push(eq(workOrders.status, status));
    }
    if (siteId) {
      conditions.push(eq(workOrders.siteId, siteId));
    }

    const baseQuery = db
      .select({
        id: workOrders.id,
        siteId: workOrders.siteId,
        siteName: sites.name,
        equipmentId: workOrders.equipmentId,
        equipmentName: equipment.name,
        alertId: workOrders.alertId,
        title: workOrders.title,
        description: workOrders.description,
        priority: workOrders.priority,
        status: workOrders.status,
        assigneeId: workOrders.assigneeId,
        assigneeName: teamMembers.name,
        steps: workOrders.steps,
        safetyRequirements: workOrders.safetyRequirements,
        partsRequired: workOrders.partsRequired,
        estimatedMinutes: workOrders.estimatedMinutes,
        actualMinutes: workOrders.actualMinutes,
        dueDate: workOrders.dueDate,
        completedAt: workOrders.completedAt,
        createdAt: workOrders.createdAt,
        updatedAt: workOrders.updatedAt,
      })
      .from(workOrders)
      .innerJoin(sites, eq(workOrders.siteId, sites.id))
      .innerJoin(equipment, eq(workOrders.equipmentId, equipment.id))
      .innerJoin(teamMembers, eq(workOrders.assigneeId, teamMembers.id))
      .orderBy(desc(workOrders.createdAt));

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch work orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch work orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      siteId,
      equipmentId,
      priority,
      assignee,
      dueDate,
      steps,
      safetyRequirements,
      partsRequired,
      estimatedMinutes,
      description,
    } = body;

    if (!title || !siteId || !equipmentId) {
      return NextResponse.json(
        { error: "title, siteId, and equipmentId are required" },
        { status: 400 }
      );
    }

    // Generate a unique ID
    const id = `wo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Resolve assignee: use provided assigneeId, or look up by name, or fallback
    let assigneeId = body.assigneeId;
    if (!assigneeId && assignee) {
      const [member] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.name, assignee))
        .limit(1);
      if (member) {
        assigneeId = member.id;
      }
    }
    if (!assigneeId) {
      // Fallback: get any team member at the site
      const [siteMember] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(eq(teamMembers.siteId, siteId))
        .limit(1);
      assigneeId = siteMember?.id || "member-1";
    }

    const workOrderSteps = (steps || []).map((desc: string, i: number) => ({
      order: i + 1,
      description: desc,
      completed: false,
      completedAt: null,
      proofImageUrl: null,
    }));

    const [created] = await db
      .insert(workOrders)
      .values({
        id,
        siteId,
        equipmentId,
        alertId: body.alertId || null,
        title,
        description: description || title,
        priority: priority || "medium",
        status: "open",
        assigneeId,
        steps: workOrderSteps,
        safetyRequirements: safetyRequirements || [],
        partsRequired: partsRequired || [],
        estimatedMinutes: estimatedMinutes || null,
        dueDate: new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create work order:", error);
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
