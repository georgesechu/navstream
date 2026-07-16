import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workOrders, sites, equipment, teamMembers } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [row] = await db
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
      .where(eq(workOrders.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("Failed to fetch work order:", error);
    return NextResponse.json(
      { error: "Failed to fetch work order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch the current work order
    const [existing] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update status if provided
    if (body.status) {
      updates.status = body.status;
      if (body.status === "completed") {
        updates.completedAt = new Date();
      }
    }

    // Update steps if provided (partial update — merge by order)
    if (body.steps && Array.isArray(body.steps)) {
      const currentSteps = (existing.steps ?? []) as {
        order: number;
        description: string;
        completed: boolean;
        completedAt: string | null;
        proofImageUrl: string | null;
      }[];

      const updatedSteps = currentSteps.map((step) => {
        const patch = body.steps.find(
          (s: { order: number }) => s.order === step.order
        );
        if (patch) {
          return {
            ...step,
            completed:
              patch.completed !== undefined ? patch.completed : step.completed,
            completedAt:
              patch.completed !== undefined
                ? patch.completed
                  ? new Date().toISOString()
                  : null
                : step.completedAt,
            proofImageUrl:
              patch.proofImageUrl !== undefined
                ? patch.proofImageUrl
                : step.proofImageUrl,
          };
        }
        return step;
      });

      updates.steps = updatedSteps;

      // Auto-complete work order if all steps are done
      const allDone = updatedSteps.every((s) => s.completed);
      if (allDone && updatedSteps.length > 0 && !body.status) {
        updates.status = "completed";
        updates.completedAt = new Date();
      }

      // Auto-set to in-progress if some steps are done
      const someDone = updatedSteps.some((s) => s.completed);
      if (
        someDone &&
        !allDone &&
        existing.status === "open" &&
        !body.status
      ) {
        updates.status = "in-progress";
      }
    }

    // Update actual minutes if provided
    if (body.actualMinutes !== undefined) {
      updates.actualMinutes = body.actualMinutes;
    }

    const [updated] = await db
      .update(workOrders)
      .set(updates)
      .where(eq(workOrders.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update work order:", error);
    return NextResponse.json(
      { error: "Failed to update work order" },
      { status: 500 }
    );
  }
}
