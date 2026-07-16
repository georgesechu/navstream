import { describe, it, expect } from "vitest";
import { computeUptime, deriveEquipmentStatus, isMaintenanceOverdue, daysUntilMaintenance } from "../equipment";
import { createMockEquipment, createMockAlert } from "@/test/factories";
import { createId } from "@/types/common";
import type { EquipmentId } from "@/types/common";

describe("computeUptime", () => {
  it("returns 100% with zero downtime", () => {
    expect(computeUptime(720, 0)).toBe(100);
  });

  it("computes correct percentage", () => {
    expect(computeUptime(100, 5)).toBe(95);
  });

  it("returns 0% with total downtime", () => {
    expect(computeUptime(100, 100)).toBe(0);
  });

  it("returns 0 for zero total hours", () => {
    expect(computeUptime(0, 0)).toBe(0);
  });

  it("rounds to one decimal place", () => {
    expect(computeUptime(1000, 7)).toBe(99.3);
  });

  it("handles negative downtime (clamps above 100% or returns >100)", () => {
    // When downtime is negative (edge case / bad data), the formula produces > 100%
    const result = computeUptime(100, -10);
    // (100 - (-10)) / 100 * 100 = 110%
    expect(result).toBe(110);
  });

  it("handles downtime exceeding total hours", () => {
    // Edge case: more downtime than total hours
    const result = computeUptime(100, 150);
    // (100 - 150) / 100 * 100 = -50%
    expect(result).toBe(-50);
  });
});

describe("deriveEquipmentStatus", () => {
  it("returns operational when no active alerts", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const status = deriveEquipmentStatus(equip, []);
    expect(status).toBe("operational");
  });

  it("returns failed when critical alert is active", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const alerts = [
      createMockAlert({ equipmentId: createId<EquipmentId>("e1"), severity: "critical", status: "active" }),
    ];
    expect(deriveEquipmentStatus(equip, alerts)).toBe("failed");
  });

  it("returns degraded when warning alert is active", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const alerts = [
      createMockAlert({ equipmentId: createId<EquipmentId>("e1"), severity: "warning", status: "active" }),
    ];
    expect(deriveEquipmentStatus(equip, alerts)).toBe("degraded");
  });

  it("ignores resolved alerts", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const alerts = [
      createMockAlert({ equipmentId: createId<EquipmentId>("e1"), severity: "critical", status: "resolved" }),
    ];
    expect(deriveEquipmentStatus(equip, alerts)).toBe("operational");
  });

  it("preserves maintenance status when no alerts", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1"), status: "maintenance" });
    expect(deriveEquipmentStatus(equip, [])).toBe("maintenance");
  });

  it("returns failed when both critical and warning alerts are active (critical wins)", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const alerts = [
      createMockAlert({ equipmentId: createId<EquipmentId>("e1"), severity: "warning", status: "active" }),
      createMockAlert({ equipmentId: createId<EquipmentId>("e1"), severity: "critical", status: "active" }),
    ];
    expect(deriveEquipmentStatus(equip, alerts)).toBe("failed");
  });

  it("ignores alerts for different equipment", () => {
    const equip = createMockEquipment({ id: createId<EquipmentId>("e1") });
    const alerts = [
      createMockAlert({ equipmentId: createId<EquipmentId>("e2"), severity: "critical", status: "active" }),
      createMockAlert({ equipmentId: createId<EquipmentId>("e3"), severity: "warning", status: "active" }),
    ];
    expect(deriveEquipmentStatus(equip, alerts)).toBe("operational");
  });
});

describe("isMaintenanceOverdue", () => {
  it("returns true when past due date", () => {
    expect(isMaintenanceOverdue("2026-07-01T00:00:00Z", new Date("2026-07-15T00:00:00Z"))).toBe(true);
  });

  it("returns false when before due date", () => {
    expect(isMaintenanceOverdue("2026-09-01T00:00:00Z", new Date("2026-07-15T00:00:00Z"))).toBe(false);
  });

  it("returns false when no date set", () => {
    expect(isMaintenanceOverdue(null, new Date())).toBe(false);
  });
});

describe("daysUntilMaintenance", () => {
  it("returns positive days for future dates", () => {
    const result = daysUntilMaintenance("2026-07-25T00:00:00Z", new Date("2026-07-15T00:00:00Z"));
    expect(result).toBe(10);
  });

  it("returns negative days for overdue dates", () => {
    const result = daysUntilMaintenance("2026-07-10T00:00:00Z", new Date("2026-07-15T00:00:00Z"));
    expect(result).toBe(-5);
  });

  it("returns null when no date", () => {
    expect(daysUntilMaintenance(null, new Date())).toBeNull();
  });
});
