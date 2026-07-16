import { EventEmitter } from "events";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sensors, sensorReadings, alerts, equipment } from "@/db/schema";
import { shouldTriggerAlert } from "@/domain/sensors";
import { shouldEscalate } from "@/domain/alerts";
import type { AlertThresholds } from "@/types/sensor";
import type { Alert } from "@/types/alert";
import type { AlertId, SiteId, EquipmentId, SensorId, TeamMemberId } from "@/types/common";

// ─── Event types ─────────────────────────────────────────────────────
export interface SensorEvent {
  sensorId: string;
  equipmentId: string;
  siteId: string;
  value: number;
  unit: string;
  sensorName: string;
  timestamp: string;
}

export interface AlertEvent {
  id: string;
  siteId: string;
  equipmentId: string;
  sensorId: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
  status: "active";
  triggerValue: number;
  thresholdValue: number;
  createdAt: string;
}

// ─── Sensor behaviour profiles ───────────────────────────────────────
interface SensorProfile {
  /** Per-tick drift added to running offset (cumulative trend) */
  drift: number;
  /** Max random noise amplitude around baseline + offset */
  noise: number;
  /** Probability (0-1) of a spike on each tick */
  spikeProbability: number;
  /** Spike magnitude when triggered */
  spikeMagnitude: number;
}

const DEFAULT_PROFILE: SensorProfile = {
  drift: 0,
  noise: 0.5,
  spikeProbability: 0,
  spikeMagnitude: 0,
};

/**
 * Match sensor profiles by sensor ID or pattern.
 * - Broken Hill pump bearing temperature: slow upward trend
 * - Pilbara screen bearing vibration: periodic spikes
 * - Everything else: stable with small noise
 */
function getProfile(sensorId: string, sensorName: string): SensorProfile {
  const lowerName = sensorName.toLowerCase();
  const lowerId = sensorId.toLowerCase();

  // Broken Hill pump bearing — temperature trending up
  if (
    (lowerId.includes("broken") || lowerId.includes("bh") || lowerId.includes("sensor-5") || lowerId.includes("sensor-6")) &&
    lowerName.includes("temperature") &&
    (lowerName.includes("bearing") || lowerName.includes("pump"))
  ) {
    return { drift: 0.35, noise: 0.4, spikeProbability: 0, spikeMagnitude: 0 };
  }

  // Pilbara screen vibration — periodic spikes
  if (
    (lowerId.includes("pilbara") || lowerId.includes("sensor-3") || lowerId.includes("sensor-4")) &&
    lowerName.includes("vibration")
  ) {
    return { drift: 0, noise: 0.2, spikeProbability: 0.15, spikeMagnitude: 3.5 };
  }

  return DEFAULT_PROFILE;
}

// ─── Simulator singleton ─────────────────────────────────────────────
class SensorSimulator extends EventEmitter {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private offsets: Map<string, number> = new Map();
  private alertCounter = 0;
  private tickCount = 0;

  /** Start the simulation loop. Idempotent — calling twice is safe. */
  async start() {
    if (this.running) return;
    this.running = true;

    console.log("[SensorSimulator] Starting sensor simulation...");

    // Initial tick immediately, then every 5 seconds
    this.tick().catch((err) => console.error("[SensorSimulator] tick error:", err));

    this.intervalHandle = setInterval(() => {
      this.tick().catch((err) => console.error("[SensorSimulator] tick error:", err));
    }, 5_000);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.running = false;
    console.log("[SensorSimulator] Stopped.");
  }

  get isRunning() {
    return this.running;
  }

  private async tick() {
    let allSensors;
    try {
      allSensors = await db.select().from(sensors);
    } catch (err) {
      console.error("[SensorSimulator] DB read failed:", err);
      return;
    }

    if (allSensors.length === 0) return;

    this.tickCount++;
    const now = new Date();
    const timestamp = now.toISOString();

    for (const sensor of allSensors) {
      const profile = getProfile(sensor.id, sensor.name);

      // Accumulate drift offset — accelerate after 10 ticks for demo visibility
      const prevOffset = this.offsets.get(sensor.id) ?? 0;
      let driftThisTick = profile.drift;
      if (driftThisTick > 0 && this.tickCount > 10) {
        // Triple drift after 10 ticks (~50s) so threshold is crossed within 2-3 min
        driftThisTick *= 3;
      }
      const newOffset = prevOffset + driftThisTick;
      this.offsets.set(sensor.id, newOffset);

      // Compute value
      const noise = (Math.random() - 0.5) * 2 * profile.noise;
      const spike =
        Math.random() < profile.spikeProbability
          ? profile.spikeMagnitude * (Math.random() > 0.5 ? 1 : -1)
          : 0;

      const value = Math.round((sensor.baseline + newOffset + noise + spike) * 100) / 100;

      // Write to DB — insert reading + update current value
      try {
        await db.insert(sensorReadings).values({
          sensorId: sensor.id,
          value,
          timestamp: now,
        });

        await db
          .update(sensors)
          .set({ currentValue: value, lastReadingAt: now })
          .where(eq(sensors.id, sensor.id));
      } catch (err) {
        console.error(`[SensorSimulator] DB write failed for ${sensor.id}:`, err);
        continue;
      }

      // Emit sensor event
      const sensorEvent: SensorEvent = {
        sensorId: sensor.id,
        equipmentId: sensor.equipmentId,
        siteId: sensor.siteId,
        value,
        unit: sensor.unit,
        sensorName: sensor.name,
        timestamp,
      };
      this.emit("sensor", sensorEvent);

      // Check thresholds
      const thresholds = sensor.thresholds as AlertThresholds;
      const severity = shouldTriggerAlert(value, thresholds);

      if (severity && (severity === "critical" || severity === "warning")) {
        await this.createAlert(sensor, value, severity, thresholds, timestamp);
      }
    }

    // Check for alert escalation — warning alerts that have been active too long
    await this.checkEscalations(now);
  }

  private async checkEscalations(now: Date) {
    const ESCALATION_MINUTES = 5;

    try {
      // Find all active warning alerts
      const activeWarnings = await db
        .select()
        .from(alerts)
        .where(
          and(
            eq(alerts.status, "active"),
            eq(alerts.severity, "warning")
          )
        );

      for (const alert of activeWarnings) {
        // Use the domain function to check if this alert should escalate
        const alertForCheck: Alert = {
          id: alert.id as AlertId,
          siteId: alert.siteId as SiteId,
          equipmentId: alert.equipmentId as EquipmentId,
          sensorId: (alert.sensorId ?? null) as SensorId | null,
          title: alert.title,
          description: alert.description,
          severity: alert.severity as Alert["severity"],
          status: alert.status as Alert["status"],
          triggerValue: alert.triggerValue,
          thresholdValue: alert.thresholdValue,
          assigneeId: (alert.assigneeId ?? null) as TeamMemberId | null,
          acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
          resolvedAt: alert.resolvedAt?.toISOString() ?? null,
          resolutionNotes: alert.resolutionNotes,
          createdAt: alert.createdAt.toISOString(),
          updatedAt: alert.updatedAt.toISOString(),
        };

        if (!shouldEscalate(alertForCheck, now, ESCALATION_MINUTES)) continue;

        // Escalate: update severity to critical in DB
        await db
          .update(alerts)
          .set({
            severity: "critical",
            updatedAt: now,
            description: `${alert.description} [Auto-escalated from warning after ${ESCALATION_MINUTES} minutes without acknowledgment]`,
          })
          .where(eq(alerts.id, alert.id));

        // Emit an alert event so SSE clients see the escalation
        const escalationEvent: AlertEvent = {
          id: alert.id,
          siteId: alert.siteId,
          equipmentId: alert.equipmentId,
          sensorId: alert.sensorId ?? "",
          title: `ESCALATED: ${alert.title}`,
          description: `${alert.description} [Auto-escalated from warning after ${ESCALATION_MINUTES} minutes without acknowledgment]`,
          severity: "critical",
          status: "active",
          triggerValue: alert.triggerValue ?? 0,
          thresholdValue: alert.thresholdValue ?? 0,
          createdAt: alert.createdAt.toISOString(),
        };

        this.emit("alert", escalationEvent);
        console.log(`[SensorSimulator] Alert escalated: ${alert.id} — ${alert.title}`);
      }
    } catch (err) {
      console.error("[SensorSimulator] Escalation check failed:", err);
    }
  }

  private async createAlert(
    sensor: typeof sensors.$inferSelect,
    value: number,
    severity: "critical" | "warning",
    thresholds: AlertThresholds,
    timestamp: string
  ) {
    // Determine which threshold was crossed
    let thresholdValue: number | null = null;
    if (severity === "critical") {
      thresholdValue = thresholds.criticalHigh !== null && value >= thresholds.criticalHigh
        ? thresholds.criticalHigh
        : thresholds.criticalLow;
    } else {
      thresholdValue = thresholds.warningHigh !== null && value >= thresholds.warningHigh
        ? thresholds.warningHigh
        : thresholds.warningLow;
    }

    // Check if there's already an active alert for this sensor to avoid spam
    try {
      const existing = await db
        .select()
        .from(alerts)
        .where(
          eq(alerts.sensorId, sensor.id)
        );

      const hasActiveAlert = existing.some(
        (a) => a.status === "active" && a.severity === severity
      );

      if (hasActiveAlert) return; // Don't duplicate
    } catch {
      // If we can't check, skip to avoid spam
      return;
    }

    // Get equipment name for the alert title
    let equipmentName = sensor.equipmentId;
    try {
      const [equip] = await db
        .select({ name: equipment.name })
        .from(equipment)
        .where(eq(equipment.id, sensor.equipmentId));
      if (equip) equipmentName = equip.name;
    } catch {
      // Use ID as fallback
    }

    this.alertCounter++;
    const alertId = `alert-sim-${Date.now()}-${this.alertCounter}`;

    const direction = value >= (sensor.baseline ?? 0) ? "above" : "below";
    const title = `${sensor.name} ${severity} on ${equipmentName}`;
    const description = `${sensor.name} reading of ${value} ${sensor.unit} is ${direction} ${severity} threshold (${thresholdValue} ${sensor.unit}). Immediate ${severity === "critical" ? "action" : "attention"} recommended.`;

    try {
      await db.insert(alerts).values({
        id: alertId,
        siteId: sensor.siteId,
        equipmentId: sensor.equipmentId,
        sensorId: sensor.id,
        title,
        description,
        severity,
        status: "active",
        triggerValue: value,
        thresholdValue,
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      });
    } catch (err) {
      console.error(`[SensorSimulator] Failed to create alert:`, err);
      return;
    }

    const alertEvent: AlertEvent = {
      id: alertId,
      siteId: sensor.siteId,
      equipmentId: sensor.equipmentId,
      sensorId: sensor.id,
      title,
      description,
      severity,
      status: "active",
      triggerValue: value,
      thresholdValue: thresholdValue ?? 0,
      createdAt: timestamp,
    };

    this.emit("alert", alertEvent);
    console.log(`[SensorSimulator] Alert created: ${severity} — ${title}`);
  }
}

// Singleton instance
export const sensorSimulator = new SensorSimulator();
