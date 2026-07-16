import { createId } from "@/types/common";
import type { Site } from "@/types/site";
import type { Equipment } from "@/types/equipment";
import type { Sensor, SensorReading, AlertThresholds } from "@/types/sensor";
import type { Alert } from "@/types/alert";
import type { WorkOrder } from "@/types/work-order";
import type { TeamMember } from "@/types/team";
import type {
  SiteId,
  EquipmentId,
  SensorId,
  AlertId,
  WorkOrderId,
  TeamMemberId,
} from "@/types/common";

let counter = 0;
function nextId(): string {
  return `test-${++counter}`;
}

export function resetIdCounter() {
  counter = 0;
}

export function createMockSite(overrides?: Partial<Site>): Site {
  const id = nextId();
  return {
    id: createId<SiteId>(`site-${id}`),
    name: `Test Site ${id}`,
    type: "Mining",
    coordinates: { lat: -30.749, lng: 121.466 },
    status: "online",
    timezone: "Australia/Perth",
    personnelCount: 10,
    activeAlerts: 0,
    uptime: 99.5,
    floorPlanUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

export function createMockEquipment(overrides?: Partial<Equipment>): Equipment {
  const id = nextId();
  return {
    id: createId<EquipmentId>(`equip-${id}`),
    siteId: createId<SiteId>("site-1"),
    name: `Test Equipment ${id}`,
    category: "pump",
    status: "operational",
    specs: {
      manufacturer: "Acme Corp",
      model: "X-2000",
      serialNumber: `SN-${id}`,
      installDate: "2024-06-01T00:00:00Z",
      warrantyExpiry: "2027-06-01T00:00:00Z",
      specifications: { "Max Pressure": "150 PSI", "Flow Rate": "500 L/min" },
    },
    location: "Pump Station — Bay 1",
    maintenanceHistory: [],
    lastServiceDate: "2026-06-01T00:00:00Z",
    nextServiceDate: "2026-09-01T00:00:00Z",
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

export function createMockSensor(overrides?: Partial<Sensor>): Sensor {
  const id = nextId();
  return {
    id: createId<SensorId>(`sensor-${id}`),
    equipmentId: createId<EquipmentId>("equip-1"),
    siteId: createId<SiteId>("site-1"),
    name: `Temperature Sensor ${id}`,
    type: "temperature",
    unit: "°C",
    thresholds: {
      warningLow: null,
      warningHigh: 130,
      criticalLow: null,
      criticalHigh: 150,
    },
    currentValue: 95,
    baseline: 100,
    lastReadingAt: "2026-07-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockAlert(overrides?: Partial<Alert>): Alert {
  const id = nextId();
  return {
    id: createId<AlertId>(`alert-${id}`),
    siteId: createId<SiteId>("site-1"),
    equipmentId: createId<EquipmentId>("equip-1"),
    sensorId: createId<SensorId>("sensor-1"),
    title: `Test Alert ${id}`,
    description: `Description for alert ${id}`,
    severity: "warning",
    status: "active",
    triggerValue: 135,
    thresholdValue: 130,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-07-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockSensorReadings(
  count: number,
  opts?: {
    sensorId?: string;
    trend?: "rising" | "stable" | "falling";
    baseValue?: number;
    noise?: number;
    startTime?: Date;
    intervalMs?: number;
  }
): SensorReading[] {
  const {
    sensorId = "sensor-1",
    trend = "stable",
    baseValue = 100,
    noise = 2,
    startTime = new Date("2026-07-15T00:00:00Z"),
    intervalMs = 60 * 60 * 1000, // 1 hour
  } = opts || {};

  const trendRate = trend === "rising" ? 0.5 : trend === "falling" ? -0.3 : 0;

  return Array.from({ length: count }, (_, i) => {
    const trendValue = baseValue + trendRate * i;
    const noiseValue = (Math.random() - 0.5) * noise * 2;
    return {
      sensorId: createId<SensorId>(sensorId),
      value: Math.round((trendValue + noiseValue) * 100) / 100,
      timestamp: new Date(startTime.getTime() + i * intervalMs).toISOString(),
    };
  });
}

export function createMockWorkOrder(overrides?: Partial<WorkOrder>): WorkOrder {
  const id = nextId();
  return {
    id: createId<WorkOrderId>(`wo-${id}`),
    siteId: createId<SiteId>("site-1"),
    equipmentId: createId<EquipmentId>("equip-1"),
    alertId: null,
    title: `Work Order ${id}`,
    description: `Description for work order ${id}`,
    priority: "medium",
    status: "open",
    assigneeId: createId<TeamMemberId>("member-1"),
    steps: [
      { order: 1, description: "Step 1", completed: false, completedAt: null, proofImageUrl: null },
      { order: 2, description: "Step 2", completed: false, completedAt: null, proofImageUrl: null },
    ],
    safetyRequirements: ["PPE required", "Lock-out/tag-out"],
    partsRequired: [],
    estimatedMinutes: 60,
    actualMinutes: null,
    dueDate: "2026-07-22T00:00:00Z",
    completedAt: null,
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-07-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockTeamMember(overrides?: Partial<TeamMember>): TeamMember {
  const id = nextId();
  return {
    id: createId<TeamMemberId>(`member-${id}`),
    name: `Team Member ${id}`,
    email: `member-${id}@meridian-demo.com`,
    role: "technician",
    siteId: createId<SiteId>("site-1"),
    status: "online",
    avatar: "TM",
    tasksCompleted: 42,
    streak: 7,
    rating: 4.5,
    badges: [],
    recentActivity: [5, 8, 6, 7, 9, 4, 8, 10, 6, 7, 8, 9],
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}
