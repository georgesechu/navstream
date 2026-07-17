import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts, workOrders, sites, equipment } from "@/db/schema";
import { eq, gte, and, or } from "drizzle-orm";

interface ChatRequest {
  message: string;
  context?: {
    siteId?: string;
    equipmentId?: string;
    siteName?: string;
    equipmentName?: string;
  };
}

interface ChatResponse {
  role: "assistant";
  content: string;
  workOrder?: WorkOrderData | null;
}

export interface WorkOrderData {
  title: string;
  site: string;
  siteId: string;
  equipment: string;
  equipmentId: string;
  priority: "critical" | "high" | "medium" | "low";
  assignee: string;
  dueDate: string;
  steps: string[];
  safetyRequirements: string[];
  partsRequired: string[];
  estimatedMinutes: number;
}

const SYSTEM_PROMPT = `You are NavStream AI, an expert in industrial equipment diagnostics, maintenance planning, and remote facility operations.

You help back-office engineers at Meridian Mining Services monitor and maintain 6 remote facilities across Australia and South America. You have deep knowledge of:
- Industrial pump systems, conveyor belts, generators, and processing equipment
- Thermal imaging analysis and bearing wear diagnostics
- Predictive maintenance scheduling
- Safety compliance and work order generation
- Sensor data interpretation (temperature, vibration, pressure, flow)

When generating work orders, respond with a JSON block wrapped in \`\`\`workorder tags:
\`\`\`workorder
{
  "title": "...",
  "site": "Site Name",
  "siteId": "site-id",
  "equipment": "Equipment Name",
  "equipmentId": "equip-id",
  "priority": "high",
  "assignee": "Technician Name",
  "dueDate": "YYYY-MM-DD",
  "steps": ["Step 1", "Step 2"],
  "safetyRequirements": ["Requirement 1"],
  "partsRequired": ["Part 1"],
  "estimatedMinutes": 120
}
\`\`\`

Be concise but thorough. Use markdown formatting for readability. Always ground your analysis in specific sensor data and thresholds when available.`;

async function generateShiftReport(): Promise<ChatResponse> {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(shiftStart.getHours() - 8);

  try {
    // Query alerts created in the last 8 hours
    const recentAlerts = await db
      .select({
        id: alerts.id,
        title: alerts.title,
        severity: alerts.severity,
        status: alerts.status,
        siteName: sites.name,
        equipmentName: equipment.name,
        createdAt: alerts.createdAt,
        resolvedAt: alerts.resolvedAt,
        acknowledgedAt: alerts.acknowledgedAt,
        resolutionNotes: alerts.resolutionNotes,
      })
      .from(alerts)
      .innerJoin(sites, eq(alerts.siteId, sites.id))
      .innerJoin(equipment, eq(alerts.equipmentId, equipment.id))
      .where(
        or(
          gte(alerts.createdAt, shiftStart),
          gte(alerts.resolvedAt, shiftStart),
          gte(alerts.updatedAt, shiftStart)
        )
      );

    // Query work orders updated in the last 8 hours
    const recentWorkOrders = await db
      .select({
        id: workOrders.id,
        title: workOrders.title,
        status: workOrders.status,
        priority: workOrders.priority,
        siteName: sites.name,
        equipmentName: equipment.name,
        updatedAt: workOrders.updatedAt,
        completedAt: workOrders.completedAt,
      })
      .from(workOrders)
      .innerJoin(sites, eq(workOrders.siteId, sites.id))
      .innerJoin(equipment, eq(workOrders.equipmentId, equipment.id))
      .where(gte(workOrders.updatedAt, shiftStart));

    // Categorize alerts
    const triggeredAlerts = recentAlerts.filter(
      (a) => a.createdAt && a.createdAt >= shiftStart
    );
    const resolvedAlerts = recentAlerts.filter(
      (a) => a.resolvedAt && a.resolvedAt >= shiftStart
    );
    const activeAlerts = recentAlerts.filter(
      (a) => a.status === "active" || a.status === "acknowledged"
    );

    // Build active issues list
    const activeIssuesList = activeAlerts.length > 0
      ? activeAlerts
          .map(
            (a) =>
              `- **[${(a.severity || "info").toUpperCase()}]** ${a.title} -- ${a.siteName}, ${a.equipmentName}${a.status === "acknowledged" ? " (acknowledged)" : ""}`
          )
          .join("\n")
      : "- No active issues";

    // Build completed work list
    const completedList =
      resolvedAlerts.length > 0
        ? resolvedAlerts
            .map(
              (a) =>
                `- ${a.title} -- ${a.siteName}${a.resolutionNotes ? ` (${a.resolutionNotes})` : ""}`
            )
            .join("\n")
        : "- No alerts resolved this shift";

    // Build work orders section
    const woSection =
      recentWorkOrders.length > 0
        ? recentWorkOrders
            .map(
              (wo) =>
                `- **${wo.title}** -- ${wo.siteName} [${wo.status}] (${wo.priority} priority)`
            )
            .join("\n")
        : "- No work order activity this shift";

    // Determine recommendations based on data
    const recommendations: string[] = [];
    const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
    const warningAlerts = activeAlerts.filter((a) => a.severity === "warning");

    if (criticalAlerts.length > 0) {
      recommendations.push(
        `Prioritize ${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? "s" : ""}: ${criticalAlerts.map((a) => `${a.title} at ${a.siteName}`).join(", ")}`
      );
    }
    if (warningAlerts.length > 0) {
      recommendations.push(
        `Monitor ${warningAlerts.length} active warning${warningAlerts.length > 1 ? "s" : ""} for potential escalation`
      );
    }
    if (recentWorkOrders.filter((wo) => wo.status === "open" || wo.status === "in-progress").length > 0) {
      recommendations.push(
        "Follow up on open/in-progress work orders for timely completion"
      );
    }
    if (recommendations.length === 0) {
      recommendations.push("All systems nominal -- continue routine monitoring");
    }

    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const formatDate = (d: Date) => d.toLocaleDateString();

    return {
      role: "assistant",
      content: `## Shift Handover Report -- ${formatDate(now)}
**Period:** ${formatTime(shiftStart)} -- ${formatTime(now)}

### Events
- ${triggeredAlerts.length} alert${triggeredAlerts.length !== 1 ? "s" : ""} triggered
- ${resolvedAlerts.length} alert${resolvedAlerts.length !== 1 ? "s" : ""} resolved
- ${recentWorkOrders.length} work order${recentWorkOrders.length !== 1 ? "s" : ""} updated

### Active Issues
${activeIssuesList}

### Completed Work
${completedList}

### Work Orders
${woSection}

### Recommendations
${recommendations.map((r) => `- ${r}`).join("\n")}`,
      workOrder: null,
    };
  } catch (error) {
    console.error("Failed to generate shift report from DB:", error);
    // Fallback to static report if DB is unavailable
    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      role: "assistant",
      content: `## Shift Handover Report -- ${now.toLocaleDateString()}
**Period:** ${formatTime(shiftStart)} -- ${formatTime(now)}

### Events
- Unable to fetch live data -- showing cached summary

### Recommendations
- Check database connectivity and retry the shift report`,
      workOrder: null,
    };
  }
}

async function getMockResponse(message: string, context?: ChatRequest["context"]): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();
  const siteName = context?.siteName || "Broken Hill Processing";
  const equipmentName = context?.equipmentName || "Pump Station";

  if (lowerMessage.includes("thermal") || lowerMessage.includes("temperature") || lowerMessage.includes("heat")) {
    return {
      role: "assistant",
      content: `## Thermal Analysis: ${equipmentName} -- ${siteName}

**Summary:** Temperature at the main bearing assembly has risen from 120\u00B0C to 142\u00B0C over the past 48 hours, which is **22\u00B0C above the 7-day baseline** of 115\u00B0C.

### Key Findings

1. **Bearing Temperature Anomaly** -- The rate of temperature increase accelerated in the last 24 hours (5\u00B0C/day vs 2\u00B0C/day average). This pattern is consistent with **early-stage bearing wear** (87% confidence).

2. **Vibration Correlation** -- Cross-referencing with vibration sensor data shows a 15% increase in lateral vibration amplitude, further supporting bearing degradation.

3. **Coolant Flow** -- Coolant flow rate has dropped 8% from baseline, which may be contributing to the temperature rise.

### Recommended Actions

- **Immediate:** Schedule lubrication of main bearing assembly
- **Within 7 days:** Physical inspection of bearing surfaces
- **Within 30 days:** Plan bearing replacement during next maintenance window
- **Monitor:** Set alert threshold at 155\u00B0C for emergency shutdown

### Risk Assessment
If left unaddressed, estimated time to failure: **14-21 days** based on degradation curve modeling.`,
      workOrder: null,
    };
  }

  if (lowerMessage.includes("work order") || lowerMessage.includes("generate")) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const workOrder: WorkOrderData = {
      title: `Bearing Inspection & Lubrication -- ${equipmentName}`,
      site: siteName,
      siteId: context?.siteId || "site-3",
      equipment: `${equipmentName} -- Main Bearing Assembly`,
      equipmentId: context?.equipmentId || "equip-5",
      priority: "high",
      assignee: "David Okonkwo",
      dueDate: dueDateStr,
      steps: [
        "Lubricate main bearing assembly using specified grease (Shell Gadus S2 V220)",
        "Inspect bearing surfaces for pitting, scoring, or discoloration",
        "Measure bearing clearances against spec (0.05-0.08mm)",
        "Check coolant flow rate and clear any obstructions",
        "Record vibration readings at 4 measurement points",
        "Photograph bearing condition for records",
      ],
      safetyRequirements: [
        "Lock-out/tag-out procedure required",
        "PPE: Hard hat, safety glasses, heat-resistant gloves",
        "Minimum 2 personnel for pump disassembly",
      ],
      partsRequired: [
        "Shell Gadus S2 V220 grease (2kg)",
        "Bearing clearance gauges",
        "Replacement gasket set (if needed)",
      ],
      estimatedMinutes: 180,
    };

    return {
      role: "assistant",
      content: `## Work Order Generated

I've prepared a maintenance work order for the bearing inspection at ${siteName}. Review the details below and click **Save Work Order** to create it in the system.`,
      workOrder,
    };
  }

  if (lowerMessage.includes("alert") || lowerMessage.includes("summary")) {
    return {
      role: "assistant",
      content: `## Active Alerts Summary

### Critical (2)
1. **Bearing temperature critical** -- ${siteName}, ${equipmentName}
   - Temperature at 142\u00B0C (threshold: 120\u00B0C)
   - Active for 15 minutes, unacknowledged
   - Recommended: Immediate inspection

2. **Communication loss** -- Svalbard Data Center
   - All communication lost 2 hours ago
   - Last heartbeat: 2 hours ago
   - Recommended: Check network infrastructure

### Warnings (3)
- Coolant flow rate degraded -- ${siteName}
- Vibration anomaly -- Pilbara Iron Ore Mine
- Solar panel efficiency drop -- Atacama Solar Farm

### Info (1)
- Scheduled maintenance due -- Karratha LNG Terminal

**Overall Status:** 2 sites require attention. ${siteName} has the most urgent issues with correlated thermal and vibration anomalies suggesting bearing degradation.`,
      workOrder: null,
    };
  }

  if (lowerMessage.includes("shift") || lowerMessage.includes("handover")) {
    return await generateShiftReport();
  }

  // Default response
  return {
    role: "assistant",
    content: `I'm NavStream AI, your industrial equipment diagnostics assistant. I can help you with:

- **Thermal Analysis** -- Analyze temperature trends, detect bearing wear, predict failures
- **Alert Summaries** -- Get a quick overview of all active alerts across your sites
- **Work Order Generation** -- Create detailed maintenance work orders with safety requirements
- **Shift Handover Reports** -- Generate comprehensive shift summaries with open items
- **Equipment Diagnostics** -- Cross-reference sensor data to identify root causes
- **Maintenance Planning** -- Schedule preventive maintenance based on equipment condition

What would you like to know? You can also use the quick prompts below to get started.`,
    workOrder: null,
  };
}

function parseWorkOrderFromContent(content: string): WorkOrderData | null {
  const match = content.match(/```workorder\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as WorkOrderData;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // Real Claude API call
      try {
        const contextInfo = body.context
          ? `\n\nCurrent context: Site "${body.context.siteName || body.context.siteId || "unknown"}", Equipment "${body.context.equipmentName || body.context.equipmentId || "unknown"}"`
          : "";

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: SYSTEM_PROMPT + contextInfo,
            messages: [
              {
                role: "user",
                content: body.message,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Anthropic API error:", response.status, errorText);
          // Fall back to mock on API error
          const mockResponse = await getMockResponse(body.message, body.context);
          return NextResponse.json(mockResponse);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || "I apologize, but I could not generate a response.";
        const workOrder = parseWorkOrderFromContent(content);

        // Strip the workorder code block from the content for display
        const cleanContent = content.replace(/```workorder\s*[\s\S]*?```/g, "").trim();

        return NextResponse.json({
          role: "assistant",
          content: cleanContent || "Work order generated. Review the details below.",
          workOrder,
        } satisfies ChatResponse);
      } catch (apiError) {
        console.error("Anthropic API call failed:", apiError);
        // Fall back to mock on network error
        const mockResponse = await getMockResponse(body.message, body.context);
        return NextResponse.json(mockResponse);
      }
    }

    // No API key — return smart mock response
    const mockResponse = await getMockResponse(body.message, body.context);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
