import type { SensorReading, AlertThresholds } from "@/types/sensor";
import type { AlertSeverity } from "@/types/alert";

export interface AnomalyResult {
  sensorId: string;
  currentValue: number;
  baseline: number;
  delta: number;
  severity: "warning" | "critical";
}

/**
 * Detect if the most recent reading is anomalous relative to baseline.
 * Returns null if within normal range.
 */
export function detectAnomaly(
  readings: SensorReading[],
  baseline: number,
  warningDelta: number,
  criticalDelta: number
): AnomalyResult | null {
  if (readings.length === 0) return null;

  // Use most recent reading
  const latest = readings.reduce((a, b) =>
    new Date(a.timestamp) > new Date(b.timestamp) ? a : b
  );

  const delta = Math.abs(latest.value - baseline);

  if (delta >= criticalDelta) {
    return {
      sensorId: latest.sensorId as string,
      currentValue: latest.value,
      baseline,
      delta,
      severity: "critical",
    };
  }

  if (delta >= warningDelta) {
    return {
      sensorId: latest.sensorId as string,
      currentValue: latest.value,
      baseline,
      delta,
      severity: "warning",
    };
  }

  return null;
}

/**
 * Check a single reading against thresholds.
 * Returns the alert severity to trigger, or null if within range.
 */
export function shouldTriggerAlert(
  value: number,
  thresholds: AlertThresholds
): AlertSeverity | null {
  if (thresholds.criticalHigh !== null && value >= thresholds.criticalHigh) return "critical";
  if (thresholds.criticalLow !== null && value <= thresholds.criticalLow) return "critical";
  if (thresholds.warningHigh !== null && value >= thresholds.warningHigh) return "warning";
  if (thresholds.warningLow !== null && value <= thresholds.warningLow) return "warning";
  return null;
}

/**
 * Compute a simple moving average over the last N readings.
 */
export function movingAverage(readings: SensorReading[], windowSize: number): number | null {
  if (readings.length === 0) return null;

  const sorted = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const window = sorted.slice(0, windowSize);
  const sum = window.reduce((acc, r) => acc + r.value, 0);
  return sum / window.length;
}

/**
 * Compute the rate of change (per hour) from recent readings.
 * Positive = increasing, negative = decreasing.
 */
export function rateOfChange(readings: SensorReading[]): number | null {
  if (readings.length < 2) return null;

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const timeDiffMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();

  if (timeDiffMs === 0) return null;

  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
  return (last.value - first.value) / timeDiffHours;
}

/**
 * Interpolate readings to fill gaps at a regular interval.
 * Returns evenly-spaced points using linear interpolation.
 */
export function interpolateTimeSeries(
  readings: SensorReading[],
  intervalMs: number,
  startTime: Date,
  endTime: Date
): { timestamp: string; value: number }[] {
  if (readings.length === 0) return [];

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const result: { timestamp: string; value: number }[] = [];
  let currentTime = startTime.getTime();

  while (currentTime <= endTime.getTime()) {
    // Find surrounding readings
    let before = sorted[0];
    let after = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      const tA = new Date(sorted[i].timestamp).getTime();
      const tB = new Date(sorted[i + 1].timestamp).getTime();
      if (tA <= currentTime && tB >= currentTime) {
        before = sorted[i];
        after = sorted[i + 1];
        break;
      }
    }

    const tBefore = new Date(before.timestamp).getTime();
    const tAfter = new Date(after.timestamp).getTime();

    let value: number;
    if (tBefore === tAfter) {
      value = before.value;
    } else {
      const ratio = (currentTime - tBefore) / (tAfter - tBefore);
      value = before.value + ratio * (after.value - before.value);
    }

    result.push({
      timestamp: new Date(currentTime).toISOString(),
      value: Math.round(value * 100) / 100,
    });

    currentTime += intervalMs;
  }

  return result;
}
