import { describe, it, expect } from "vitest";
import { detectAnomaly, shouldTriggerAlert, movingAverage, rateOfChange, interpolateTimeSeries } from "../sensors";
import { createMockSensorReadings } from "@/test/factories";
import { createId } from "@/types/common";
import type { SensorId } from "@/types/common";
import type { AlertThresholds } from "@/types/sensor";

describe("detectAnomaly", () => {
  it("returns null when readings are within threshold", () => {
    const readings = createMockSensorReadings(10, { baseValue: 100, noise: 0 });
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).toBeNull();
  });

  it("returns warning when delta exceeds warning threshold", () => {
    const readings = [
      {
        sensorId: createId<SensorId>("s1"),
        value: 115,
        timestamp: "2026-07-15T10:00:00Z",
      },
    ];
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.delta).toBe(15);
  });

  it("returns critical when delta exceeds critical threshold", () => {
    const readings = [
      {
        sensorId: createId<SensorId>("s1"),
        value: 125,
        timestamp: "2026-07-15T10:00:00Z",
      },
    ];
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
  });

  it("handles empty readings array", () => {
    expect(detectAnomaly([], 100, 10, 20)).toBeNull();
  });

  it("uses most recent reading", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T09:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 150, timestamp: "2026-07-15T10:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T08:00:00Z" },
    ];
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).not.toBeNull();
    expect(result!.currentValue).toBe(150);
  });

  it("returns null when readings are all exactly at baseline (delta = 0)", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T09:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T10:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T11:00:00Z" },
    ];
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).toBeNull();
  });

  it("detects anomaly below baseline", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 75, timestamp: "2026-07-15T10:00:00Z" },
    ];
    const result = detectAnomaly(readings, 100, 10, 20);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.delta).toBe(25);
  });
});

describe("shouldTriggerAlert", () => {
  const thresholds: AlertThresholds = {
    warningLow: 20,
    warningHigh: 130,
    criticalLow: 10,
    criticalHigh: 150,
  };

  it("returns null when value is within normal range", () => {
    expect(shouldTriggerAlert(100, thresholds)).toBeNull();
  });

  it("returns warning when value exceeds warningHigh", () => {
    expect(shouldTriggerAlert(135, thresholds)).toBe("warning");
  });

  it("returns critical when value exceeds criticalHigh", () => {
    expect(shouldTriggerAlert(155, thresholds)).toBe("critical");
  });

  it("returns warning when value drops below warningLow", () => {
    expect(shouldTriggerAlert(15, thresholds)).toBe("warning");
  });

  it("returns critical when value drops below criticalLow", () => {
    expect(shouldTriggerAlert(5, thresholds)).toBe("critical");
  });

  it("critical takes precedence over warning", () => {
    // Value exceeds both critical and warning thresholds
    expect(shouldTriggerAlert(160, thresholds)).toBe("critical");
  });

  it("handles null thresholds (no limits set)", () => {
    const noLimits: AlertThresholds = {
      warningLow: null,
      warningHigh: null,
      criticalLow: null,
      criticalHigh: null,
    };
    expect(shouldTriggerAlert(999, noLimits)).toBeNull();
  });

  it("returns warning when value is exactly at warningHigh boundary", () => {
    expect(shouldTriggerAlert(130, thresholds)).toBe("warning");
  });

  it("returns critical when value is exactly at criticalHigh boundary", () => {
    expect(shouldTriggerAlert(150, thresholds)).toBe("critical");
  });

  it("returns warning when value is exactly at warningLow boundary", () => {
    expect(shouldTriggerAlert(20, thresholds)).toBe("warning");
  });

  it("returns critical when value is exactly at criticalLow boundary", () => {
    expect(shouldTriggerAlert(10, thresholds)).toBe("critical");
  });
});

describe("movingAverage", () => {
  it("computes average of last N readings", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 10, timestamp: "2026-07-15T01:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 20, timestamp: "2026-07-15T02:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 30, timestamp: "2026-07-15T03:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 40, timestamp: "2026-07-15T04:00:00Z" },
    ];
    // Window of 2: latest two readings (40, 30) → avg 35
    expect(movingAverage(readings, 2)).toBe(35);
  });

  it("handles window larger than array", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 10, timestamp: "2026-07-15T01:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 20, timestamp: "2026-07-15T02:00:00Z" },
    ];
    expect(movingAverage(readings, 10)).toBe(15);
  });

  it("returns null for empty array", () => {
    expect(movingAverage([], 5)).toBeNull();
  });

  it("returns the latest value when window size is 1", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 10, timestamp: "2026-07-15T01:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 20, timestamp: "2026-07-15T02:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 30, timestamp: "2026-07-15T03:00:00Z" },
    ];
    // Window of 1: only the most recent reading (sorted descending by time → value 30)
    expect(movingAverage(readings, 1)).toBe(30);
  });
});

describe("rateOfChange", () => {
  it("computes positive rate for rising values", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T10:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 110, timestamp: "2026-07-15T11:00:00Z" },
    ];
    expect(rateOfChange(readings)).toBe(10); // 10 per hour
  });

  it("computes negative rate for falling values", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T10:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 80, timestamp: "2026-07-15T12:00:00Z" },
    ];
    expect(rateOfChange(readings)).toBe(-10); // -20 over 2 hours = -10/hr
  });

  it("returns null for fewer than 2 readings", () => {
    expect(rateOfChange([])).toBeNull();
    expect(
      rateOfChange([{ sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T10:00:00Z" }])
    ).toBeNull();
  });
});

describe("interpolateTimeSeries", () => {
  it("returns empty array for empty readings", () => {
    const result = interpolateTimeSeries(
      [],
      3600000,
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T03:00:00Z")
    );
    expect(result).toEqual([]);
  });

  it("produces evenly spaced points at the given interval", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T00:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 200, timestamp: "2026-07-15T02:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      3600000, // 1 hour
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T02:00:00Z")
    );

    // Should produce 3 points: 00:00, 01:00, 02:00
    expect(result).toHaveLength(3);
    expect(result[0].timestamp).toBe("2026-07-15T00:00:00.000Z");
    expect(result[1].timestamp).toBe("2026-07-15T01:00:00.000Z");
    expect(result[2].timestamp).toBe("2026-07-15T02:00:00.000Z");
  });

  it("linearly interpolates values between readings", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T00:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 200, timestamp: "2026-07-15T02:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      3600000,
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T02:00:00Z")
    );

    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(150); // midpoint interpolated
    expect(result[2].value).toBe(200);
  });

  it("handles single reading by using that value for all points", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 42, timestamp: "2026-07-15T01:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      3600000,
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T02:00:00Z")
    );

    expect(result).toHaveLength(3);
    // Single reading means before === after, so value is constant
    expect(result[0].value).toBe(42);
    expect(result[1].value).toBe(42);
    expect(result[2].value).toBe(42);
  });

  it("handles unsorted readings correctly", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 200, timestamp: "2026-07-15T02:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T00:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      3600000,
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T02:00:00Z")
    );

    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(150);
    expect(result[2].value).toBe(200);
  });

  it("returns single point when start equals end", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 50, timestamp: "2026-07-15T01:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      3600000,
      new Date("2026-07-15T01:00:00Z"),
      new Date("2026-07-15T01:00:00Z")
    );

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(50);
  });

  it("interpolates correctly with multiple readings", () => {
    const readings = [
      { sensorId: createId<SensorId>("s1"), value: 0, timestamp: "2026-07-15T00:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 100, timestamp: "2026-07-15T01:00:00Z" },
      { sensorId: createId<SensorId>("s1"), value: 50, timestamp: "2026-07-15T02:00:00Z" },
    ];

    const result = interpolateTimeSeries(
      readings,
      1800000, // 30 minutes
      new Date("2026-07-15T00:00:00Z"),
      new Date("2026-07-15T02:00:00Z")
    );

    // 5 points: 00:00, 00:30, 01:00, 01:30, 02:00
    expect(result).toHaveLength(5);
    expect(result[0].value).toBe(0);     // exact reading
    expect(result[1].value).toBe(50);    // interpolated between 0 and 100
    expect(result[2].value).toBe(100);   // exact reading
    expect(result[3].value).toBe(75);    // interpolated between 100 and 50
    expect(result[4].value).toBe(50);    // exact reading
  });
});
