import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  username: varchar("username", { length: 128 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("engineer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Sites ───────────────────────────────────────────────────────────
export const sites = pgTable("sites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("online"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  personnelCount: integer("personnel_count").notNull().default(0),
  activeAlerts: integer("active_alerts").notNull().default(0),
  uptime: real("uptime").notNull().default(100),
  floorPlanUrl: text("floor_plan_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Equipment ───────────────────────────────────────────────────────
export const equipment = pgTable(
  "equipment",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("operational"),
    location: text("location"),
    specs: jsonb("specs").$type<{
      manufacturer: string;
      model: string;
      serialNumber: string;
      installDate: string;
      warrantyExpiry: string | null;
      specifications: Record<string, string>;
    }>(),
    maintenanceHistory: jsonb("maintenance_history").$type<
      {
        date: string;
        type: string;
        description: string;
        technician: string;
        durationMinutes: number;
        partsReplaced: string[];
      }[]
    >().default([]),
    lastServiceDate: timestamp("last_service_date", { withTimezone: true }),
    nextServiceDate: timestamp("next_service_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("equipment_site_idx").on(table.siteId)]
);

// ─── Sensors ─────────────────────────────────────────────────────────
export const sensors = pgTable(
  "sensors",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    equipmentId: varchar("equipment_id", { length: 64 })
      .notNull()
      .references(() => equipment.id),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    unit: varchar("unit", { length: 16 }).notNull(),
    thresholds: jsonb("thresholds").$type<{
      warningLow: number | null;
      warningHigh: number | null;
      criticalLow: number | null;
      criticalHigh: number | null;
    }>().notNull(),
    currentValue: real("current_value"),
    baseline: real("baseline").notNull(),
    lastReadingAt: timestamp("last_reading_at", { withTimezone: true }),
  },
  (table) => [
    index("sensor_equipment_idx").on(table.equipmentId),
    index("sensor_site_idx").on(table.siteId),
  ]
);

// ─── Sensor Readings (time series) ──────────────────────────────────
export const sensorReadings = pgTable(
  "sensor_readings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sensorId: varchar("sensor_id", { length: 64 })
      .notNull()
      .references(() => sensors.id),
    value: real("value").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reading_sensor_idx").on(table.sensorId),
    index("reading_timestamp_idx").on(table.timestamp),
  ]
);

// ─── Alerts ──────────────────────────────────────────────────────────
export const alerts = pgTable(
  "alerts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    equipmentId: varchar("equipment_id", { length: 64 })
      .notNull()
      .references(() => equipment.id),
    sensorId: varchar("sensor_id", { length: 64 }).references(() => sensors.id),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    severity: varchar("severity", { length: 16 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    triggerValue: real("trigger_value"),
    thresholdValue: real("threshold_value"),
    assigneeId: varchar("assignee_id", { length: 64 }).references(() => teamMembers.id),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("alert_site_idx").on(table.siteId),
    index("alert_equipment_idx").on(table.equipmentId),
    index("alert_status_idx").on(table.status),
  ]
);

// ─── Camera Feeds ────────────────────────────────────────────────────
export const cameraFeeds = pgTable(
  "camera_feeds",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    equipmentId: varchar("equipment_id", { length: 64 }).references(() => equipment.id),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    streamId: varchar("stream_id", { length: 128 }).notNull(),
    resolution: varchar("resolution", { length: 16 }),
    fps: integer("fps"),
    isLive: boolean("is_live").notNull().default(false),
    isRecording: boolean("is_recording").notNull().default(false),
  },
  (table) => [index("camera_site_idx").on(table.siteId)]
);

// ─── POIs ────────────────────────────────────────────────────────────
export const pois = pgTable(
  "pois",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    equipmentId: varchar("equipment_id", { length: 64 }).references(() => equipment.id),
    cameraFeedId: varchar("camera_feed_id", { length: 64 }).references(() => cameraFeeds.id),
    label: varchar("label", { length: 255 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("online"),
  },
  (table) => [index("poi_site_idx").on(table.siteId)]
);

// ─── Team Members ────────────────────────────────────────────────────
export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: varchar("role", { length: 32 }).notNull(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    status: varchar("status", { length: 16 }).notNull().default("offline"),
    avatar: varchar("avatar", { length: 8 }).notNull(),
    tasksCompleted: integer("tasks_completed").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    rating: real("rating").notNull().default(0),
    badges: jsonb("badges").$type<string[]>().default([]),
    recentActivity: jsonb("recent_activity").$type<number[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("member_site_idx").on(table.siteId)]
);

// ─── Work Orders ─────────────────────────────────────────────────────
export const workOrders = pgTable(
  "work_orders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    equipmentId: varchar("equipment_id", { length: 64 })
      .notNull()
      .references(() => equipment.id),
    alertId: varchar("alert_id", { length: 64 }).references(() => alerts.id),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 16 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    assigneeId: varchar("assignee_id", { length: 64 })
      .notNull()
      .references(() => teamMembers.id),
    steps: jsonb("steps").$type<
      {
        order: number;
        description: string;
        completed: boolean;
        completedAt: string | null;
        proofImageUrl: string | null;
      }[]
    >().default([]),
    safetyRequirements: jsonb("safety_requirements").$type<string[]>().default([]),
    partsRequired: jsonb("parts_required").$type<string[]>().default([]),
    estimatedMinutes: integer("estimated_minutes"),
    actualMinutes: integer("actual_minutes"),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("wo_site_idx").on(table.siteId),
    index("wo_equipment_idx").on(table.equipmentId),
    index("wo_status_idx").on(table.status),
  ]
);

// ─── Field Devices (QR-paired smartphones) ──────────────────────────
export const fieldDevices = pgTable(
  "field_devices",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    siteId: varchar("site_id", { length: 64 })
      .notNull()
      .references(() => sites.id),
    name: varchar("name", { length: 255 }).notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("offline"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lat: real("lat"),
    lng: real("lng"),
    heading: real("heading"),
    batteryLevel: integer("battery_level"),
    cameraQuality: varchar("camera_quality", { length: 16 }).notNull().default("medium"),
    livekitRoomId: varchar("livekit_room_id", { length: 128 }),
    createdBy: varchar("created_by", { length: 64 }).references(() => teamMembers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("device_site_idx").on(table.siteId),
    index("device_token_idx").on(table.token),
  ]
);
