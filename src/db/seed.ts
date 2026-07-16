/**
 * NavStream Seed Script
 *
 * Populates the database with rich, interconnected demo data for the
 * "Meridian Mining Services" demo company. Idempotent — deletes all
 * existing data before inserting.
 *
 * Usage: npx tsx src/db/seed.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  sites,
  equipment,
  sensors,
  sensorReadings,
  alerts,
  cameraFeeds,
  pois,
  teamMembers,
  workOrders,
} from "./schema";
import { hash } from "bcryptjs";

// ─── DB Connection ──────────────────────────────────────────────────
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://navstream:navstream@localhost:5432/navstream";

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

// ─── Deterministic pseudo-random ────────────────────────────────────
// Simple seeded PRNG so sensor data is reproducible across runs.
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
const rng = createRng(42);

/** Returns a small amount of gaussian-ish noise */
function noise(amplitude: number): number {
  // Box-Muller approximation using our seeded rng
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  return z * amplitude;
}

// ─── Time helpers ───────────────────────────────────────────────────
const NOW = new Date("2026-07-15T10:00:00Z");

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 3600_000);
}
function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 86400_000);
}
function daysFromNow(d: number): Date {
  return new Date(NOW.getTime() + d * 86400_000);
}

// ─── Logging ────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ─── Data Definitions ───────────────────────────────────────────────

// ── Sites ───────────────────────────────────────────────────────────

const SITES = [
  {
    id: "site-kalgoorlie",
    name: "Kalgoorlie Gold Mine",
    type: "Mining",
    lat: -30.749,
    lng: 121.466,
    status: "online",
    timezone: "Australia/Perth",
    personnelCount: 12,
    activeAlerts: 1,
    uptime: 99.7,
  },
  {
    id: "site-pilbara",
    name: "Pilbara Iron Ore",
    type: "Mining",
    lat: -22.297,
    lng: 118.775,
    status: "warning",
    timezone: "Australia/Perth",
    personnelCount: 9,
    activeAlerts: 3,
    uptime: 97.8,
  },
  {
    id: "site-broken-hill",
    name: "Broken Hill Processing",
    type: "Processing",
    lat: -31.956,
    lng: 141.468,
    status: "critical",
    timezone: "Australia/Sydney",
    personnelCount: 8,
    activeAlerts: 4,
    uptime: 94.2,
    floorPlanUrl: "/floor-plans/broken-hill.svg",
  },
  {
    id: "site-darwin",
    name: "Darwin LNG Terminal",
    type: "Energy",
    lat: -12.46,
    lng: 130.845,
    status: "online",
    timezone: "Australia/Darwin",
    personnelCount: 7,
    activeAlerts: 0,
    uptime: 99.9,
  },
  {
    id: "site-atacama",
    name: "Atacama Solar Farm",
    type: "Energy",
    lat: -23.5,
    lng: -68.2,
    status: "online",
    timezone: "America/Santiago",
    personnelCount: 5,
    activeAlerts: 0,
    uptime: 99.5,
  },
  {
    id: "site-svalbard",
    name: "Svalbard Data Center",
    type: "Data Center",
    lat: 78.23,
    lng: 15.63,
    status: "offline",
    timezone: "Arctic/Longyearbyen",
    personnelCount: 3,
    activeAlerts: 2,
    uptime: 88.1,
  },
];

// ── Team Members ────────────────────────────────────────────────────

const TEAM = [
  {
    id: "tm-james",
    name: "James Mitchell",
    email: "james.mitchell@meridian-mining.com",
    role: "technician",
    siteId: "site-kalgoorlie",
    status: "online",
    avatar: "JM",
    tasksCompleted: 142,
    streak: 14,
    rating: 4.8,
    badges: ["Fast Responder", "Safety Star", "100 Tasks"],
    recentActivity: [8, 6, 9, 7, 5, 8, 7],
  },
  {
    id: "tm-sarah",
    name: "Sarah Chen",
    email: "sarah.chen@meridian-mining.com",
    role: "engineer",
    siteId: "site-pilbara",
    status: "online",
    avatar: "SC",
    tasksCompleted: 89,
    streak: 7,
    rating: 4.9,
    badges: ["Diagnostics Expert", "Mentor"],
    recentActivity: [5, 7, 4, 8, 6, 5, 9],
  },
  {
    id: "tm-david",
    name: "David Okonkwo",
    email: "david.okonkwo@meridian-mining.com",
    role: "technician",
    siteId: "site-broken-hill",
    status: "online",
    avatar: "DO",
    tasksCompleted: 203,
    streak: 22,
    rating: 4.7,
    badges: ["Pump Specialist", "Night Owl", "200 Tasks", "Fast Responder"],
    recentActivity: [9, 8, 10, 7, 9, 8, 11],
  },
  {
    id: "tm-emma",
    name: "Emma Torres",
    email: "emma.torres@meridian-mining.com",
    role: "engineer",
    siteId: "site-darwin",
    status: "online",
    avatar: "ET",
    tasksCompleted: 67,
    streak: 5,
    rating: 4.6,
    badges: ["Safety Star"],
    recentActivity: [3, 5, 4, 6, 3, 4, 5],
  },
  {
    id: "tm-alex",
    name: "Alex Petrov",
    email: "alex.petrov@meridian-mining.com",
    role: "technician",
    siteId: "site-atacama",
    status: "offline",
    avatar: "AP",
    tasksCompleted: 45,
    streak: 0,
    rating: 4.3,
    badges: ["Solar Specialist"],
    recentActivity: [4, 3, 2, 5, 4, 3, 0],
  },
  {
    id: "tm-li",
    name: "Li Wei",
    email: "li.wei@meridian-mining.com",
    role: "engineer",
    siteId: "site-svalbard",
    status: "offline",
    avatar: "LW",
    tasksCompleted: 112,
    streak: 0,
    rating: 4.5,
    badges: ["Network Guru", "100 Tasks", "Cold Weather"],
    recentActivity: [6, 7, 5, 0, 0, 0, 0],
  },
  {
    id: "tm-maria",
    name: "Maria Santos",
    email: "maria.santos@meridian-mining.com",
    role: "admin",
    siteId: "site-kalgoorlie", // HQ representative, assigned to first site
    status: "online",
    avatar: "MS",
    tasksCompleted: 34,
    streak: 3,
    rating: 4.9,
    badges: ["Operations Lead", "Mentor"],
    recentActivity: [2, 3, 2, 4, 3, 2, 3],
  },
  {
    id: "tm-george",
    name: "George Sechu",
    email: "george@meridian-mining.com",
    role: "admin",
    siteId: "site-kalgoorlie",
    status: "online",
    avatar: "GS",
    tasksCompleted: 0,
    streak: 0,
    rating: 5.0,
    badges: ["Platform Admin"],
    recentActivity: [1, 1, 2, 1, 0, 1, 1],
  },
];

// ── Equipment ───────────────────────────────────────────────────────

const EQUIPMENT = [
  // ── Broken Hill (hero site - detailed) ────────────────────────────
  {
    id: "eq-bh-pump-main",
    siteId: "site-broken-hill",
    name: "Main Coolant Pump",
    category: "Pump",
    status: "critical",
    location: "Pump Station — Bay 3",
    specs: {
      manufacturer: "Grundfos",
      model: "CR 95-4",
      serialNumber: "GF-2024-BH-0041",
      installDate: "2024-01-15",
      warrantyExpiry: "2027-01-15",
      specifications: {
        "Flow Rate": "95 m\u00b3/h",
        "Head Pressure": "42 bar",
        "Motor Power": "45 kW",
        RPM: "2950",
        "Bearing Type": "SKF 6316-2Z",
      },
    },
    maintenanceHistory: [
      {
        date: "2026-06-01",
        type: "Scheduled",
        description: "Quarterly bearing inspection — passed",
        technician: "David Okonkwo",
        durationMinutes: 120,
        partsReplaced: [],
      },
      {
        date: "2026-03-10",
        type: "Scheduled",
        description: "Annual overhaul — impeller and seals replaced",
        technician: "David Okonkwo",
        durationMinutes: 480,
        partsReplaced: ["Impeller CR95", "Mechanical Seal 65mm"],
      },
      {
        date: "2025-12-02",
        type: "Unscheduled",
        description: "Vibration anomaly — coupling alignment corrected",
        technician: "James Mitchell",
        durationMinutes: 90,
        partsReplaced: [],
      },
    ],
    lastServiceDate: daysAgo(44),
    nextServiceDate: daysFromNow(46),
  },
  {
    id: "eq-bh-crusher",
    siteId: "site-broken-hill",
    name: "Primary Jaw Crusher",
    category: "Crusher",
    status: "operational",
    location: "Crusher Room — North",
    specs: {
      manufacturer: "Metso",
      model: "C150",
      serialNumber: "MT-2023-BH-0012",
      installDate: "2023-06-20",
      warrantyExpiry: "2026-06-20",
      specifications: {
        "Feed Opening": "1500 x 1200 mm",
        Capacity: "800 t/h",
        "Motor Power": "250 kW",
        Weight: "80 tonnes",
      },
    },
    maintenanceHistory: [
      {
        date: "2026-05-15",
        type: "Scheduled",
        description: "Jaw plate wear inspection — 40% remaining",
        technician: "David Okonkwo",
        durationMinutes: 60,
        partsReplaced: [],
      },
    ],
    lastServiceDate: daysAgo(61),
    nextServiceDate: daysFromNow(30),
  },
  {
    id: "eq-bh-conveyor-main",
    siteId: "site-broken-hill",
    name: "Main Conveyor Belt",
    category: "Conveyor",
    status: "operational",
    location: "Conveyor Hall — Line 1",
    specs: {
      manufacturer: "Continental",
      model: "CBG-3200",
      serialNumber: "CN-2024-BH-0088",
      installDate: "2024-03-01",
      warrantyExpiry: "2029-03-01",
      specifications: {
        Width: "1200 mm",
        Length: "340 m",
        Speed: "3.5 m/s",
        Capacity: "2000 t/h",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(30),
    nextServiceDate: daysFromNow(60),
  },
  {
    id: "eq-bh-cooling",
    siteId: "site-broken-hill",
    name: "Cooling Tower",
    category: "HVAC",
    status: "warning",
    location: "Cooling System — Exterior",
    specs: {
      manufacturer: "Baltimore Aircoil",
      model: "FXT-642",
      serialNumber: "BAC-2023-BH-0055",
      installDate: "2023-11-10",
      warrantyExpiry: "2028-11-10",
      specifications: {
        "Cooling Capacity": "2500 kW",
        "Flow Rate": "400 m\u00b3/h",
        "Fan Power": "55 kW",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(20),
    nextServiceDate: daysFromNow(70),
  },
  {
    id: "eq-bh-generator",
    siteId: "site-broken-hill",
    name: "Backup Generator",
    category: "Generator",
    status: "operational",
    location: "Power House",
    specs: {
      manufacturer: "Caterpillar",
      model: "C32 ACERT",
      serialNumber: "CAT-2022-BH-0003",
      installDate: "2022-08-15",
      warrantyExpiry: "2027-08-15",
      specifications: {
        Power: "1100 kVA",
        Voltage: "415V",
        "Fuel Type": "Diesel",
        "Tank Capacity": "3000 L",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(15),
    nextServiceDate: daysFromNow(75),
  },
  {
    id: "eq-bh-compressor",
    siteId: "site-broken-hill",
    name: "Air Compressor",
    category: "Compressor",
    status: "operational",
    location: "Utility Room",
    specs: {
      manufacturer: "Atlas Copco",
      model: "GA 90+",
      serialNumber: "AC-2024-BH-0077",
      installDate: "2024-02-01",
      warrantyExpiry: "2027-02-01",
      specifications: {
        "Free Air Delivery": "15.6 m\u00b3/min",
        "Max Pressure": "13 bar",
        "Motor Power": "90 kW",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(10),
    nextServiceDate: daysFromNow(80),
  },
  {
    id: "eq-bh-transformer",
    siteId: "site-broken-hill",
    name: "Main Transformer",
    category: "Electrical",
    status: "operational",
    location: "Substation",
    specs: {
      manufacturer: "ABB",
      model: "RESIBLOC",
      serialNumber: "ABB-2023-BH-0022",
      installDate: "2023-04-12",
      warrantyExpiry: "2033-04-12",
      specifications: {
        Rating: "2500 kVA",
        "Primary Voltage": "11 kV",
        "Secondary Voltage": "415 V",
        "Cooling Type": "AN/AF",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(90),
    nextServiceDate: daysFromNow(0),
  },
  {
    id: "eq-bh-filtration",
    siteId: "site-broken-hill",
    name: "Water Filtration Unit",
    category: "Filtration",
    status: "operational",
    location: "Water Treatment",
    specs: {
      manufacturer: "Pall Corporation",
      model: "Aria AP-4",
      serialNumber: "PC-2024-BH-0061",
      installDate: "2024-05-20",
      warrantyExpiry: "2029-05-20",
      specifications: {
        "Flow Rate": "120 m\u00b3/h",
        "Filter Size": "0.1 \u03bcm",
        "Operating Pressure": "2.5 bar",
      },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(25),
    nextServiceDate: daysFromNow(65),
  },

  // ── Kalgoorlie ────────────────────────────────────────────────────
  {
    id: "eq-kg-hoist",
    siteId: "site-kalgoorlie",
    name: "Main Mine Hoist",
    category: "Hoist",
    status: "operational",
    location: "Shaft Head",
    specs: {
      manufacturer: "ABB",
      model: "ACS880",
      serialNumber: "ABB-2022-KG-0001",
      installDate: "2022-02-10",
      warrantyExpiry: "2027-02-10",
      specifications: { "Drum Diameter": "4.5 m", "Rope Speed": "18 m/s", "Motor Power": "3200 kW" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(7),
    nextServiceDate: daysFromNow(83),
  },
  {
    id: "eq-kg-ventilation",
    siteId: "site-kalgoorlie",
    name: "Underground Ventilation Fan",
    category: "HVAC",
    status: "operational",
    location: "Vent Shaft Surface",
    specs: {
      manufacturer: "Howden",
      model: "VANE AXIAL 2800",
      serialNumber: "HW-2023-KG-0018",
      installDate: "2023-08-15",
      warrantyExpiry: "2028-08-15",
      specifications: { "Air Volume": "450 m\u00b3/s", "Fan Diameter": "2.8 m", Power: "1500 kW" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(14),
    nextServiceDate: daysFromNow(76),
  },
  {
    id: "eq-kg-dewater",
    siteId: "site-kalgoorlie",
    name: "Dewatering Pump",
    category: "Pump",
    status: "operational",
    location: "Level 12 Sump",
    specs: {
      manufacturer: "Flygt",
      model: "BS 2630",
      serialNumber: "FL-2024-KG-0033",
      installDate: "2024-04-01",
      warrantyExpiry: "2027-04-01",
      specifications: { "Flow Rate": "120 l/s", Head: "80 m", Power: "110 kW" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(21),
    nextServiceDate: daysFromNow(69),
  },

  // ── Pilbara ───────────────────────────────────────────────────────
  {
    id: "eq-pb-screen",
    siteId: "site-pilbara",
    name: "Vibrating Screen",
    category: "Screen",
    status: "warning",
    location: "Screening Plant — Bay 2",
    specs: {
      manufacturer: "Sandvik",
      model: "WS 3352",
      serialNumber: "SV-2023-PB-0009",
      installDate: "2023-10-01",
      warrantyExpiry: "2026-10-01",
      specifications: {
        "Screen Area": "16.8 m\u00b2",
        "Amplitude": "8-12 mm",
        "Motor Power": "2 x 22 kW",
      },
    },
    maintenanceHistory: [
      {
        date: "2026-07-01",
        type: "Unscheduled",
        description: "Excessive vibration — bearing clearance at limit",
        technician: "Sarah Chen",
        durationMinutes: 180,
        partsReplaced: [],
      },
    ],
    lastServiceDate: daysAgo(14),
    nextServiceDate: daysFromNow(16),
  },
  {
    id: "eq-pb-stacker",
    siteId: "site-pilbara",
    name: "Ore Stacker",
    category: "Conveyor",
    status: "operational",
    location: "Stockpile Area",
    specs: {
      manufacturer: "TAKRAF",
      model: "RS-3000",
      serialNumber: "TK-2022-PB-0005",
      installDate: "2022-12-15",
      warrantyExpiry: null,
      specifications: { "Boom Length": "45 m", Capacity: "5000 t/h", "Slew Speed": "0.15 rpm" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(30),
    nextServiceDate: daysFromNow(60),
  },
  {
    id: "eq-pb-loader",
    siteId: "site-pilbara",
    name: "Front-End Loader",
    category: "Vehicle",
    status: "operational",
    location: "Loading Bay",
    specs: {
      manufacturer: "Caterpillar",
      model: "994K",
      serialNumber: "CAT-2023-PB-0042",
      installDate: "2023-03-20",
      warrantyExpiry: "2028-03-20",
      specifications: { "Bucket Capacity": "36 t", Power: "1377 kW", Weight: "240 t" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(5),
    nextServiceDate: daysFromNow(85),
  },

  // ── Darwin ────────────────────────────────────────────────────────
  {
    id: "eq-dw-compressor",
    siteId: "site-darwin",
    name: "LNG Compressor Train",
    category: "Compressor",
    status: "operational",
    location: "Liquefaction Unit",
    specs: {
      manufacturer: "GE Vernova",
      model: "LM2500+",
      serialNumber: "GE-2021-DW-0002",
      installDate: "2021-06-01",
      warrantyExpiry: "2031-06-01",
      specifications: { Power: "34 MW", "Compression Ratio": "3.2:1", "Flow Rate": "2.8 MTPA" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(12),
    nextServiceDate: daysFromNow(78),
  },
  {
    id: "eq-dw-tank",
    siteId: "site-darwin",
    name: "LNG Storage Tank",
    category: "Tank",
    status: "operational",
    location: "Tank Farm — Tank 2",
    specs: {
      manufacturer: "CB&I",
      model: "Full Containment",
      serialNumber: "CBI-2020-DW-0001",
      installDate: "2020-01-15",
      warrantyExpiry: null,
      specifications: { Capacity: "180,000 m\u00b3", "Operating Temp": "-162\u00b0C", "Inner Shell": "9% Nickel Steel" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(60),
    nextServiceDate: daysFromNow(30),
  },

  // ── Atacama ───────────────────────────────────────────────────────
  {
    id: "eq-at-inverter",
    siteId: "site-atacama",
    name: "Central Inverter",
    category: "Electrical",
    status: "operational",
    location: "Inverter Station A",
    specs: {
      manufacturer: "SMA",
      model: "Sunny Central 2750-EV",
      serialNumber: "SMA-2023-AT-0015",
      installDate: "2023-05-10",
      warrantyExpiry: "2033-05-10",
      specifications: { "AC Power": "2750 kVA", Efficiency: "98.7%", "Max DC Voltage": "1500 V" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(18),
    nextServiceDate: daysFromNow(72),
  },
  {
    id: "eq-at-tracker",
    siteId: "site-atacama",
    name: "Solar Tracker Array",
    category: "Mechanical",
    status: "operational",
    location: "Field B — Row 12",
    specs: {
      manufacturer: "NEXTracker",
      model: "NX Horizon",
      serialNumber: "NXT-2023-AT-0100",
      installDate: "2023-05-10",
      warrantyExpiry: "2043-05-10",
      specifications: { "Tracking Range": "\u00b160\u00b0", "Module Count": "90 per row", "Row Length": "85 m" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(45),
    nextServiceDate: daysFromNow(45),
  },

  // ── Svalbard ──────────────────────────────────────────────────────
  {
    id: "eq-sv-ups",
    siteId: "site-svalbard",
    name: "UPS System",
    category: "Electrical",
    status: "offline",
    location: "Power Room A",
    specs: {
      manufacturer: "Eaton",
      model: "93PM",
      serialNumber: "EA-2024-SV-0007",
      installDate: "2024-01-20",
      warrantyExpiry: "2029-01-20",
      specifications: { Capacity: "500 kVA", "Battery Runtime": "15 min", Topology: "Double Conversion" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(8),
    nextServiceDate: daysFromNow(82),
  },
  {
    id: "eq-sv-cooling",
    siteId: "site-svalbard",
    name: "Free Cooling Unit",
    category: "HVAC",
    status: "offline",
    location: "Cooling Plant — Exterior",
    specs: {
      manufacturer: "Stulz",
      model: "CyberAir 3PRO",
      serialNumber: "ST-2024-SV-0011",
      installDate: "2024-03-01",
      warrantyExpiry: "2029-03-01",
      specifications: { "Cooling Capacity": "350 kW", "Power Usage": "12 kW", PUE: "1.08" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(10),
    nextServiceDate: daysFromNow(80),
  },
  {
    id: "eq-sv-network",
    siteId: "site-svalbard",
    name: "Core Network Switch",
    category: "Networking",
    status: "offline",
    location: "Network Room",
    specs: {
      manufacturer: "Arista",
      model: "7280R3",
      serialNumber: "AR-2024-SV-0019",
      installDate: "2024-02-15",
      warrantyExpiry: "2029-02-15",
      specifications: { Ports: "48x 100GbE", Throughput: "12.8 Tbps", "Power Draw": "450 W" },
    },
    maintenanceHistory: [],
    lastServiceDate: daysAgo(5),
    nextServiceDate: daysFromNow(85),
  },
];

// ── Sensors ─────────────────────────────────────────────────────────

const SENSORS = [
  // ── Broken Hill — Main Pump (hero sensors) ────────────────────────
  {
    id: "sen-bh-pump-temp",
    equipmentId: "eq-bh-pump-main",
    siteId: "site-broken-hill",
    name: "Bearing Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 130, criticalLow: null, criticalHigh: 145 },
    currentValue: 142,
    baseline: 120,
  },
  {
    id: "sen-bh-pump-vib",
    equipmentId: "eq-bh-pump-main",
    siteId: "site-broken-hill",
    name: "Bearing Vibration",
    type: "vibration",
    unit: "mm/s",
    thresholds: { warningLow: null, warningHigh: 7.1, criticalLow: null, criticalHigh: 11.0 },
    currentValue: 8.4,
    baseline: 4.5,
  },
  {
    id: "sen-bh-pump-flow",
    equipmentId: "eq-bh-pump-main",
    siteId: "site-broken-hill",
    name: "Coolant Flow Rate",
    type: "flow",
    unit: "m\u00b3/h",
    thresholds: { warningLow: 75, warningHigh: null, criticalLow: 60, criticalHigh: null },
    currentValue: 72,
    baseline: 95,
  },
  {
    id: "sen-bh-pump-pressure",
    equipmentId: "eq-bh-pump-main",
    siteId: "site-broken-hill",
    name: "Discharge Pressure",
    type: "pressure",
    unit: "bar",
    thresholds: { warningLow: 35, warningHigh: 48, criticalLow: 30, criticalHigh: 50 },
    currentValue: 38,
    baseline: 42,
  },

  // ── Broken Hill — Crusher ─────────────────────────────────────────
  {
    id: "sen-bh-crusher-temp",
    equipmentId: "eq-bh-crusher",
    siteId: "site-broken-hill",
    name: "Motor Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 85, criticalLow: null, criticalHigh: 95 },
    currentValue: 72,
    baseline: 68,
  },
  {
    id: "sen-bh-crusher-vib",
    equipmentId: "eq-bh-crusher",
    siteId: "site-broken-hill",
    name: "Frame Vibration",
    type: "vibration",
    unit: "mm/s",
    thresholds: { warningLow: null, warningHigh: 12, criticalLow: null, criticalHigh: 18 },
    currentValue: 9.1,
    baseline: 8.5,
  },

  // ── Broken Hill — Cooling Tower ───────────────────────────────────
  {
    id: "sen-bh-cool-temp",
    equipmentId: "eq-bh-cooling",
    siteId: "site-broken-hill",
    name: "Water Outlet Temp",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 32, criticalLow: null, criticalHigh: 38 },
    currentValue: 33,
    baseline: 28,
  },
  {
    id: "sen-bh-cool-flow",
    equipmentId: "eq-bh-cooling",
    siteId: "site-broken-hill",
    name: "Circulation Flow",
    type: "flow",
    unit: "m\u00b3/h",
    thresholds: { warningLow: 350, warningHigh: null, criticalLow: 300, criticalHigh: null },
    currentValue: 365,
    baseline: 400,
  },

  // ── Pilbara — Vibrating Screen ────────────────────────────────────
  {
    id: "sen-pb-screen-vib",
    equipmentId: "eq-pb-screen",
    siteId: "site-pilbara",
    name: "Screen Vibration Amplitude",
    type: "vibration",
    unit: "mm",
    thresholds: { warningLow: 7, warningHigh: 13, criticalLow: 5, criticalHigh: 15 },
    currentValue: 13.2,
    baseline: 10,
  },
  {
    id: "sen-pb-screen-temp",
    equipmentId: "eq-pb-screen",
    siteId: "site-pilbara",
    name: "Motor Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 80, criticalLow: null, criticalHigh: 95 },
    currentValue: 76,
    baseline: 65,
  },

  // ── Kalgoorlie — Hoist ────────────────────────────────────────────
  {
    id: "sen-kg-hoist-temp",
    equipmentId: "eq-kg-hoist",
    siteId: "site-kalgoorlie",
    name: "Motor Winding Temp",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 90, criticalLow: null, criticalHigh: 105 },
    currentValue: 78,
    baseline: 75,
  },
  {
    id: "sen-kg-hoist-vib",
    equipmentId: "eq-kg-hoist",
    siteId: "site-kalgoorlie",
    name: "Drum Vibration",
    type: "vibration",
    unit: "mm/s",
    thresholds: { warningLow: null, warningHigh: 5, criticalLow: null, criticalHigh: 8 },
    currentValue: 3.2,
    baseline: 2.8,
  },

  // ── Darwin — Compressor ───────────────────────────────────────────
  {
    id: "sen-dw-comp-temp",
    equipmentId: "eq-dw-compressor",
    siteId: "site-darwin",
    name: "Discharge Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 180, criticalLow: null, criticalHigh: 200 },
    currentValue: 162,
    baseline: 158,
  },
  {
    id: "sen-dw-comp-pressure",
    equipmentId: "eq-dw-compressor",
    siteId: "site-darwin",
    name: "Suction Pressure",
    type: "pressure",
    unit: "bar",
    thresholds: { warningLow: 28, warningHigh: 38, criticalLow: 25, criticalHigh: 40 },
    currentValue: 33,
    baseline: 33,
  },
  {
    id: "sen-dw-tank-level",
    equipmentId: "eq-dw-tank",
    siteId: "site-darwin",
    name: "Tank Level",
    type: "level",
    unit: "%",
    thresholds: { warningLow: 20, warningHigh: 95, criticalLow: 10, criticalHigh: 98 },
    currentValue: 67,
    baseline: 60,
  },

  // ── Atacama — Inverter ────────────────────────────────────────────
  {
    id: "sen-at-inv-power",
    equipmentId: "eq-at-inverter",
    siteId: "site-atacama",
    name: "AC Output Power",
    type: "power",
    unit: "kW",
    thresholds: { warningLow: null, warningHigh: 2700, criticalLow: null, criticalHigh: 2800 },
    currentValue: 2340,
    baseline: 2200,
  },
  {
    id: "sen-at-inv-temp",
    equipmentId: "eq-at-inverter",
    siteId: "site-atacama",
    name: "Inverter Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 55, criticalLow: null, criticalHigh: 65 },
    currentValue: 42,
    baseline: 40,
  },

  // ── Svalbard — UPS ────────────────────────────────────────────────
  {
    id: "sen-sv-ups-load",
    equipmentId: "eq-sv-ups",
    siteId: "site-svalbard",
    name: "UPS Load",
    type: "power",
    unit: "%",
    thresholds: { warningLow: null, warningHigh: 80, criticalLow: null, criticalHigh: 95 },
    currentValue: 0,
    baseline: 45,
  },
  {
    id: "sen-sv-cool-temp",
    equipmentId: "eq-sv-cooling",
    siteId: "site-svalbard",
    name: "Server Room Temperature",
    type: "temperature",
    unit: "\u00b0C",
    thresholds: { warningLow: null, warningHigh: 28, criticalLow: null, criticalHigh: 35 },
    currentValue: 0,
    baseline: 18,
  },
];

// ── Camera Feeds ────────────────────────────────────────────────────

const CAMERAS = [
  {
    id: "cam-1",
    siteId: "site-broken-hill",
    equipmentId: null,
    name: "Control Room Overview",
    type: "standard",
    streamId: "cam-control-room",
    resolution: "1920x1080",
    fps: 30,
    isLive: true,
    isRecording: true,
  },
  {
    id: "cam-2",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-hoist",
    name: "Main Shaft Camera",
    type: "standard",
    streamId: "cam-main-shaft",
    resolution: "1920x1080",
    fps: 30,
    isLive: true,
    isRecording: true,
  },
  {
    id: "cam-3",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-crusher",
    name: "Processing Floor",
    type: "standard",
    streamId: "cam-processing",
    resolution: "1920x1080",
    fps: 25,
    isLive: true,
    isRecording: true,
  },
  {
    id: "cam-4",
    siteId: "site-pilbara",
    equipmentId: null,
    name: "Perimeter Camera",
    type: "standard",
    streamId: "cam-perimeter",
    resolution: "2560x1440",
    fps: 15,
    isLive: true,
    isRecording: false,
  },
  {
    id: "cam-5",
    siteId: "site-atacama",
    equipmentId: "eq-at-tracker",
    name: "Solar Array Overview",
    type: "standard",
    streamId: "cam-solar-array",
    resolution: "3840x2160",
    fps: 15,
    isLive: true,
    isRecording: false,
  },
  {
    id: "cam-6",
    siteId: "site-darwin",
    equipmentId: "eq-dw-tank",
    name: "LNG Tank Monitoring",
    type: "standard",
    streamId: "cam-lng-tank",
    resolution: "1920x1080",
    fps: 30,
    isLive: true,
    isRecording: true,
  },
  {
    id: "cam-7",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    name: "360\u00b0 Pump Station",
    type: "360",
    streamId: "cam-360-pump-station",
    resolution: "5760x2880",
    fps: 30,
    isLive: true,
    isRecording: true,
  },
  {
    id: "cam-8",
    siteId: "site-broken-hill",
    equipmentId: null,
    name: "360\u00b0 Control Room",
    type: "360",
    streamId: "cam-360-control-room",
    resolution: "5760x2880",
    fps: 30,
    isLive: true,
    isRecording: false,
  },
  {
    id: "cam-9",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    name: "Thermal — Pump Bearing",
    type: "thermal",
    streamId: "cam-thermal-furnace",
    resolution: "640x480",
    fps: 15,
    isLive: true,
    isRecording: true,
  },
];

// ── POIs ────────────────────────────────────────────────────────────

const POIS = [
  // ── Broken Hill POIs (15) ─────────────────────────────────────────
  { id: "poi-bh-1", siteId: "site-broken-hill", equipmentId: "eq-bh-pump-main", cameraFeedId: "cam-7", label: "Main Coolant Pump", type: "equipment", x: 65, y: 55, status: "critical" },
  { id: "poi-bh-2", siteId: "site-broken-hill", equipmentId: "eq-bh-crusher", cameraFeedId: "cam-3", label: "Primary Jaw Crusher", type: "equipment", x: 25, y: 30, status: "online" },
  { id: "poi-bh-3", siteId: "site-broken-hill", equipmentId: "eq-bh-conveyor-main", cameraFeedId: null, label: "Main Conveyor Belt", type: "equipment", x: 45, y: 35, status: "online" },
  { id: "poi-bh-4", siteId: "site-broken-hill", equipmentId: "eq-bh-cooling", cameraFeedId: null, label: "Cooling Tower", type: "equipment", x: 80, y: 20, status: "warning" },
  { id: "poi-bh-5", siteId: "site-broken-hill", equipmentId: "eq-bh-generator", cameraFeedId: null, label: "Backup Generator", type: "equipment", x: 15, y: 75, status: "online" },
  { id: "poi-bh-6", siteId: "site-broken-hill", equipmentId: "eq-bh-compressor", cameraFeedId: null, label: "Air Compressor", type: "equipment", x: 35, y: 65, status: "online" },
  { id: "poi-bh-7", siteId: "site-broken-hill", equipmentId: "eq-bh-transformer", cameraFeedId: null, label: "Main Transformer", type: "equipment", x: 10, y: 50, status: "online" },
  { id: "poi-bh-8", siteId: "site-broken-hill", equipmentId: "eq-bh-filtration", cameraFeedId: null, label: "Water Filtration", type: "equipment", x: 75, y: 70, status: "online" },
  { id: "poi-bh-9", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: "cam-1", label: "Control Room Camera", type: "camera", x: 50, y: 85, status: "online" },
  { id: "poi-bh-10", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: "cam-9", label: "Thermal Camera", type: "camera", x: 70, y: 50, status: "online" },
  { id: "poi-bh-11", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: "cam-8", label: "360\u00b0 Control Room", type: "camera", x: 48, y: 82, status: "online" },
  { id: "poi-bh-12", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: null, label: "Emergency Exit A", type: "zone", x: 5, y: 90, status: "online" },
  { id: "poi-bh-13", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: null, label: "Fire Suppression Panel", type: "zone", x: 55, y: 90, status: "online" },
  { id: "poi-bh-14", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: null, label: "PPE Station", type: "zone", x: 40, y: 90, status: "online" },
  { id: "poi-bh-15", siteId: "site-broken-hill", equipmentId: null, cameraFeedId: "cam-3", label: "Processing Camera", type: "camera", x: 30, y: 28, status: "online" },

  // ── Kalgoorlie POIs (10) ──────────────────────────────────────────
  { id: "poi-kg-1", siteId: "site-kalgoorlie", equipmentId: "eq-kg-hoist", cameraFeedId: "cam-2", label: "Main Mine Hoist", type: "equipment", x: 50, y: 30, status: "online" },
  { id: "poi-kg-2", siteId: "site-kalgoorlie", equipmentId: "eq-kg-ventilation", cameraFeedId: null, label: "Ventilation Fan", type: "equipment", x: 80, y: 20, status: "online" },
  { id: "poi-kg-3", siteId: "site-kalgoorlie", equipmentId: "eq-kg-dewater", cameraFeedId: null, label: "Dewatering Pump", type: "equipment", x: 30, y: 60, status: "online" },
  { id: "poi-kg-4", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: "cam-2", label: "Shaft Camera", type: "camera", x: 55, y: 25, status: "online" },
  { id: "poi-kg-5", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "Explosives Magazine", type: "zone", x: 15, y: 15, status: "online" },
  { id: "poi-kg-6", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "First Aid Station", type: "zone", x: 60, y: 80, status: "online" },
  { id: "poi-kg-7", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "Ore Pass", type: "zone", x: 45, y: 45, status: "online" },
  { id: "poi-kg-8", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "Fuel Storage", type: "zone", x: 90, y: 70, status: "online" },
  { id: "poi-kg-9", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "Workshop", type: "zone", x: 70, y: 65, status: "online" },
  { id: "poi-kg-10", siteId: "site-kalgoorlie", equipmentId: null, cameraFeedId: null, label: "Emergency Muster", type: "zone", x: 10, y: 90, status: "online" },

  // ── Pilbara POIs (8) ──────────────────────────────────────────────
  { id: "poi-pb-1", siteId: "site-pilbara", equipmentId: "eq-pb-screen", cameraFeedId: null, label: "Vibrating Screen", type: "equipment", x: 40, y: 40, status: "warning" },
  { id: "poi-pb-2", siteId: "site-pilbara", equipmentId: "eq-pb-stacker", cameraFeedId: null, label: "Ore Stacker", type: "equipment", x: 70, y: 30, status: "online" },
  { id: "poi-pb-3", siteId: "site-pilbara", equipmentId: "eq-pb-loader", cameraFeedId: null, label: "Front-End Loader", type: "equipment", x: 55, y: 65, status: "online" },
  { id: "poi-pb-4", siteId: "site-pilbara", equipmentId: null, cameraFeedId: "cam-4", label: "Perimeter Camera", type: "camera", x: 90, y: 10, status: "online" },
  { id: "poi-pb-5", siteId: "site-pilbara", equipmentId: null, cameraFeedId: null, label: "Weighbridge", type: "zone", x: 20, y: 80, status: "online" },
  { id: "poi-pb-6", siteId: "site-pilbara", equipmentId: null, cameraFeedId: null, label: "Sample Lab", type: "zone", x: 30, y: 55, status: "online" },
  { id: "poi-pb-7", siteId: "site-pilbara", equipmentId: null, cameraFeedId: null, label: "Dust Suppression", type: "zone", x: 60, y: 45, status: "online" },
  { id: "poi-pb-8", siteId: "site-pilbara", equipmentId: null, cameraFeedId: null, label: "Emergency Muster", type: "zone", x: 10, y: 90, status: "online" },

  // ── Darwin POIs (6) ───────────────────────────────────────────────
  { id: "poi-dw-1", siteId: "site-darwin", equipmentId: "eq-dw-compressor", cameraFeedId: null, label: "LNG Compressor", type: "equipment", x: 35, y: 45, status: "online" },
  { id: "poi-dw-2", siteId: "site-darwin", equipmentId: "eq-dw-tank", cameraFeedId: "cam-6", label: "LNG Storage Tank", type: "equipment", x: 70, y: 35, status: "online" },
  { id: "poi-dw-3", siteId: "site-darwin", equipmentId: null, cameraFeedId: "cam-6", label: "Tank Camera", type: "camera", x: 75, y: 30, status: "online" },
  { id: "poi-dw-4", siteId: "site-darwin", equipmentId: null, cameraFeedId: null, label: "Flare Stack", type: "zone", x: 90, y: 15, status: "online" },
  { id: "poi-dw-5", siteId: "site-darwin", equipmentId: null, cameraFeedId: null, label: "Loading Jetty", type: "zone", x: 15, y: 80, status: "online" },
  { id: "poi-dw-6", siteId: "site-darwin", equipmentId: null, cameraFeedId: null, label: "Gas Detector Array", type: "zone", x: 50, y: 60, status: "online" },

  // ── Atacama POIs (6) ──────────────────────────────────────────────
  { id: "poi-at-1", siteId: "site-atacama", equipmentId: "eq-at-inverter", cameraFeedId: null, label: "Central Inverter", type: "equipment", x: 50, y: 50, status: "online" },
  { id: "poi-at-2", siteId: "site-atacama", equipmentId: "eq-at-tracker", cameraFeedId: "cam-5", label: "Tracker Array", type: "equipment", x: 30, y: 30, status: "online" },
  { id: "poi-at-3", siteId: "site-atacama", equipmentId: null, cameraFeedId: "cam-5", label: "Solar Array Camera", type: "camera", x: 25, y: 25, status: "online" },
  { id: "poi-at-4", siteId: "site-atacama", equipmentId: null, cameraFeedId: null, label: "Weather Station", type: "zone", x: 80, y: 20, status: "online" },
  { id: "poi-at-5", siteId: "site-atacama", equipmentId: null, cameraFeedId: null, label: "Battery Storage", type: "zone", x: 60, y: 70, status: "online" },
  { id: "poi-at-6", siteId: "site-atacama", equipmentId: null, cameraFeedId: null, label: "Substation", type: "zone", x: 45, y: 80, status: "online" },

  // ── Svalbard POIs (6) ─────────────────────────────────────────────
  { id: "poi-sv-1", siteId: "site-svalbard", equipmentId: "eq-sv-ups", cameraFeedId: null, label: "UPS System", type: "equipment", x: 30, y: 40, status: "offline" },
  { id: "poi-sv-2", siteId: "site-svalbard", equipmentId: "eq-sv-cooling", cameraFeedId: null, label: "Free Cooling Unit", type: "equipment", x: 70, y: 25, status: "offline" },
  { id: "poi-sv-3", siteId: "site-svalbard", equipmentId: "eq-sv-network", cameraFeedId: null, label: "Core Switch", type: "equipment", x: 50, y: 55, status: "offline" },
  { id: "poi-sv-4", siteId: "site-svalbard", equipmentId: null, cameraFeedId: null, label: "Server Hall A", type: "zone", x: 40, y: 35, status: "offline" },
  { id: "poi-sv-5", siteId: "site-svalbard", equipmentId: null, cameraFeedId: null, label: "Server Hall B", type: "zone", x: 60, y: 35, status: "offline" },
  { id: "poi-sv-6", siteId: "site-svalbard", equipmentId: null, cameraFeedId: null, label: "Fuel Depot", type: "zone", x: 85, y: 75, status: "offline" },
];

// ── Alerts ──────────────────────────────────────────────────────────

const ALERTS = [
  // ── Broken Hill — the hero story (pump failure escalation) ────────
  {
    id: "alert-bh-1",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    sensorId: "sen-bh-pump-temp",
    title: "Bearing temperature exceeds critical threshold",
    description: "Main coolant pump bearing temperature has reached 142\u00b0C, exceeding the critical threshold of 145\u00b0C. Immediate inspection required. AI diagnostic suggests early-stage bearing wear (87% confidence). Recommend lubrication check and bearing replacement within 48 hours.",
    severity: "critical",
    status: "active",
    triggerValue: 142,
    thresholdValue: 145,
    assigneeId: "tm-david",
    acknowledgedAt: hoursAgo(1),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
  },
  {
    id: "alert-bh-2",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    sensorId: "sen-bh-pump-vib",
    title: "Abnormal vibration pattern detected",
    description: "Bearing vibration at 8.4 mm/s exceeds warning threshold of 7.1 mm/s. Pattern analysis indicates developing bearing defect. Correlates with rising temperature trend.",
    severity: "warning",
    status: "acknowledged",
    triggerValue: 8.4,
    thresholdValue: 7.1,
    assigneeId: "tm-david",
    acknowledgedAt: hoursAgo(3),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(3),
  },
  {
    id: "alert-bh-3",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    sensorId: "sen-bh-pump-flow",
    title: "Coolant flow rate below warning threshold",
    description: "Flow rate dropped to 72 m\u00b3/h (warning: 75 m\u00b3/h). Likely caused by increased fluid viscosity from overheating or partial blockage in return line.",
    severity: "warning",
    status: "active",
    triggerValue: 72,
    thresholdValue: 75,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: "alert-bh-4",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-cooling",
    sensorId: "sen-bh-cool-temp",
    title: "Cooling tower outlet temperature elevated",
    description: "Water outlet temperature at 33\u00b0C, above 32\u00b0C warning threshold. Reduced cooling efficiency during heatwave conditions.",
    severity: "warning",
    status: "active",
    triggerValue: 33,
    thresholdValue: 32,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(8),
  },

  // ── Broken Hill — resolved alerts (shows the system works) ────────
  {
    id: "alert-bh-5",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-crusher",
    sensorId: "sen-bh-crusher-vib",
    title: "Crusher frame vibration spike",
    description: "Momentary vibration spike to 14.2 mm/s during large ore feed. Returned to normal within 5 minutes.",
    severity: "warning",
    status: "resolved",
    triggerValue: 14.2,
    thresholdValue: 12,
    assigneeId: "tm-david",
    acknowledgedAt: daysAgo(3),
    resolvedAt: daysAgo(3),
    resolutionNotes: "Transient spike caused by oversize ore fragment. Adjusted feed rate. No damage found.",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "alert-bh-6",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-generator",
    sensorId: null,
    title: "Generator auto-start test completed",
    description: "Weekly automatic generator start test completed successfully. Run time: 5 minutes, all parameters normal.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: daysAgo(1),
    resolutionNotes: "Automated test — no action required.",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },

  // ── Pilbara — vibration warnings ──────────────────────────────────
  {
    id: "alert-pb-1",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-screen",
    sensorId: "sen-pb-screen-vib",
    title: "Vibrating screen amplitude exceeding upper limit",
    description: "Screen vibration amplitude at 13.2 mm, above the 13 mm warning threshold. Bearing clearance at limit per last inspection. Scheduled for bearing replacement.",
    severity: "warning",
    status: "acknowledged",
    triggerValue: 13.2,
    thresholdValue: 13,
    assigneeId: "tm-sarah",
    acknowledgedAt: daysAgo(1),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "alert-pb-2",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-screen",
    sensorId: "sen-pb-screen-temp",
    title: "Screen motor temperature rising",
    description: "Motor temperature at 76\u00b0C, trending upward. Still below 80\u00b0C warning threshold but rate of increase warrants monitoring.",
    severity: "info",
    status: "active",
    triggerValue: 76,
    thresholdValue: 80,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "alert-pb-3",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-loader",
    sensorId: null,
    title: "Loader hydraulic fluid level low",
    description: "Hydraulic reservoir at 62% — scheduled top-up required before next shift.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-sarah",
    acknowledgedAt: daysAgo(5),
    resolvedAt: daysAgo(4),
    resolutionNotes: "Topped up hydraulic fluid to 95%. No leaks found during inspection.",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },

  // ── Kalgoorlie ────────────────────────────────────────────────────
  {
    id: "alert-kg-1",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-hoist",
    sensorId: "sen-kg-hoist-temp",
    title: "Hoist motor winding temperature elevated",
    description: "Motor winding temperature at 78\u00b0C during heavy production shift. Normal for extended operation but monitoring.",
    severity: "info",
    status: "active",
    triggerValue: 78,
    thresholdValue: 90,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(12),
  },
  {
    id: "alert-kg-2",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-ventilation",
    sensorId: null,
    title: "Ventilation fan belt replaced",
    description: "Routine belt replacement completed during scheduled maintenance window.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-james",
    acknowledgedAt: daysAgo(7),
    resolvedAt: daysAgo(7),
    resolutionNotes: "Belt replaced with new Continental 3V1060. Tension set to spec.",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: "alert-kg-3",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-dewater",
    sensorId: null,
    title: "Dewatering pump cavitation detected",
    description: "Cavitation noise detected at level 12 sump pump. Water level was low, pump running at reduced flow.",
    severity: "warning",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-james",
    acknowledgedAt: daysAgo(10),
    resolvedAt: daysAgo(10),
    resolutionNotes: "Water level restored after upstream blockage cleared. Pump operating normally.",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // ── Darwin ────────────────────────────────────────────────────────
  {
    id: "alert-dw-1",
    siteId: "site-darwin",
    equipmentId: "eq-dw-compressor",
    sensorId: "sen-dw-comp-temp",
    title: "Compressor discharge temp within normal",
    description: "Post-maintenance verification — compressor discharge temperature stable at 162\u00b0C, well within operating range.",
    severity: "info",
    status: "resolved",
    triggerValue: 162,
    thresholdValue: 180,
    assigneeId: "tm-emma",
    acknowledgedAt: daysAgo(12),
    resolvedAt: daysAgo(12),
    resolutionNotes: "Maintenance verification complete. All parameters nominal.",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },
  {
    id: "alert-dw-2",
    siteId: "site-darwin",
    equipmentId: "eq-dw-tank",
    sensorId: "sen-dw-tank-level",
    title: "Tank level approaching scheduled shipment threshold",
    description: "Tank 2 at 67% capacity. Next LNG carrier scheduled in 5 days — on track.",
    severity: "info",
    status: "resolved",
    triggerValue: 67,
    thresholdValue: 95,
    assigneeId: null,
    acknowledgedAt: null,
    resolvedAt: daysAgo(2),
    resolutionNotes: "Informational — level tracking as expected for shipment schedule.",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },

  // ── Atacama ───────────────────────────────────────────────────────
  {
    id: "alert-at-1",
    siteId: "site-atacama",
    equipmentId: "eq-at-tracker",
    sensorId: null,
    title: "Tracker row 12 stow position calibration drift",
    description: "Solar tracker stow position offset by 0.3\u00b0. Within tolerance but flagged for next maintenance cycle.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-alex",
    acknowledgedAt: daysAgo(8),
    resolvedAt: daysAgo(6),
    resolutionNotes: "Calibration adjusted. Tracker returning to correct stow position.",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(6),
  },
  {
    id: "alert-at-2",
    siteId: "site-atacama",
    equipmentId: "eq-at-inverter",
    sensorId: "sen-at-inv-temp",
    title: "Inverter temperature spike during peak generation",
    description: "Brief temperature spike to 52\u00b0C during peak solar production. Cooling fans responded normally.",
    severity: "warning",
    status: "resolved",
    triggerValue: 52,
    thresholdValue: 55,
    assigneeId: "tm-alex",
    acknowledgedAt: daysAgo(15),
    resolvedAt: daysAgo(15),
    resolutionNotes: "Transient spike. Fans cleaned to improve airflow. Temperature now stable.",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },

  // ── Svalbard — comms lost ─────────────────────────────────────────
  {
    id: "alert-sv-1",
    siteId: "site-svalbard",
    equipmentId: "eq-sv-network",
    sensorId: null,
    title: "Primary network link DOWN",
    description: "Subsea fiber link to mainland lost. Last telemetry received 4 hours ago. Satellite backup link also unresponsive. Possible storm damage to antenna and fiber landing station.",
    severity: "critical",
    status: "active",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-li",
    acknowledgedAt: hoursAgo(3),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(3),
  },
  {
    id: "alert-sv-2",
    siteId: "site-svalbard",
    equipmentId: "eq-sv-ups",
    sensorId: "sen-sv-ups-load",
    title: "UPS status unknown — no telemetry",
    description: "Unable to read UPS load and battery status. All monitoring lost due to network outage. Last known state: 45% load, battery full.",
    severity: "warning",
    status: "active",
    triggerValue: 0,
    thresholdValue: null,
    assigneeId: "tm-li",
    acknowledgedAt: hoursAgo(3),
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(3),
  },

  // ── More resolved alerts for analytics ────────────────────────────
  {
    id: "alert-bh-7",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-compressor",
    sensorId: null,
    title: "Air compressor oil level low",
    description: "Oil sight glass reading below minimum. Scheduled top-up performed.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-david",
    acknowledgedAt: daysAgo(20),
    resolvedAt: daysAgo(20),
    resolutionNotes: "Oil topped up to correct level. No leaks found.",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: "alert-kg-4",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-hoist",
    sensorId: null,
    title: "Hoist rope inspection due",
    description: "Scheduled 90-day wire rope inspection notification.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-james",
    acknowledgedAt: daysAgo(14),
    resolvedAt: daysAgo(14),
    resolutionNotes: "Rope inspection completed. 15% wear — within limits. Next inspection in 90 days.",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  {
    id: "alert-pb-4",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-stacker",
    sensorId: null,
    title: "Stacker slew gear lubrication overdue",
    description: "Automated lubrication system flagged slew gear as overdue for grease cycle.",
    severity: "info",
    status: "resolved",
    triggerValue: null,
    thresholdValue: null,
    assigneeId: "tm-sarah",
    acknowledgedAt: daysAgo(18),
    resolvedAt: daysAgo(17),
    resolutionNotes: "Manual grease application completed. Auto-lube system recalibrated.",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(17),
  },
];

// ── Work Orders ─────────────────────────────────────────────────────

const WORK_ORDERS = [
  // ── The hero work order — Broken Hill pump bearing ────────────────
  {
    id: "wo-bh-1",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-pump-main",
    alertId: "alert-bh-1",
    title: "Emergency Bearing Inspection — Main Coolant Pump",
    description: "Critical bearing temperature alert on main coolant pump. Temperature trending from 120\u00b0C to 142\u00b0C over 48 hours. AI diagnostic: 87% probability of early-stage bearing wear. Immediate inspection and lubrication required. Prepare for potential bearing replacement (SKF 6316-2Z).",
    priority: "critical",
    status: "open",
    assigneeId: "tm-david",
    steps: [
      { order: 1, description: "Lock out / tag out pump motor (LOTO procedure 4.2.1)", completed: false, completedAt: null, proofImageUrl: null },
      { order: 2, description: "Remove bearing housing access panel", completed: false, completedAt: null, proofImageUrl: null },
      { order: 3, description: "Visual inspection of bearing condition and grease color", completed: false, completedAt: null, proofImageUrl: null },
      { order: 4, description: "Measure bearing clearance with dial indicator (spec: 0.04-0.07mm)", completed: false, completedAt: null, proofImageUrl: null },
      { order: 5, description: "Apply Mobilgrease XHP 222 to bearing assembly", completed: false, completedAt: null, proofImageUrl: null },
      { order: 6, description: "Reassemble, remove LOTO, start pump and verify temperature drop", completed: false, completedAt: null, proofImageUrl: null },
    ],
    safetyRequirements: [
      "PPE: Safety glasses, gloves, steel-toe boots",
      "LOTO required — follow procedure 4.2.1",
      "Hot surface warning — bearing housing may be >100\u00b0C",
      "Two-person job — spotter required",
    ],
    partsRequired: [
      "Mobilgrease XHP 222 (1 cartridge)",
      "SKF 6316-2Z bearing (standby — in site stores)",
      "Gasket kit GK-CR95",
    ],
    estimatedMinutes: 180,
    actualMinutes: null,
    dueDate: daysFromNow(1),
    completedAt: null,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  },
  {
    id: "wo-bh-2",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-cooling",
    alertId: "alert-bh-4",
    title: "Cooling Tower Fan Inspection",
    description: "Outlet temperature elevated during heatwave. Check fan blade condition, clean fill media, verify spray nozzles.",
    priority: "high",
    status: "open",
    assigneeId: "tm-david",
    steps: [
      { order: 1, description: "Shut down cooling tower fan", completed: false, completedAt: null, proofImageUrl: null },
      { order: 2, description: "Inspect fan blades for damage or buildup", completed: false, completedAt: null, proofImageUrl: null },
      { order: 3, description: "Clean fill media and check spray nozzles", completed: false, completedAt: null, proofImageUrl: null },
      { order: 4, description: "Restart and verify temperature improvement", completed: false, completedAt: null, proofImageUrl: null },
    ],
    safetyRequirements: ["PPE required", "Fan must be locked out before inspection"],
    partsRequired: ["Replacement spray nozzles (4x, if needed)"],
    estimatedMinutes: 120,
    actualMinutes: null,
    dueDate: daysFromNow(3),
    completedAt: null,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },

  // ── Completed work orders ─────────────────────────────────────────
  {
    id: "wo-bh-3",
    siteId: "site-broken-hill",
    equipmentId: "eq-bh-crusher",
    alertId: "alert-bh-5",
    title: "Crusher Vibration Investigation",
    description: "Investigate vibration spike on primary jaw crusher. Check feed size, jaw plate condition, and toggle plate.",
    priority: "medium",
    status: "completed",
    assigneeId: "tm-david",
    steps: [
      { order: 1, description: "Review vibration data and feed records", completed: true, completedAt: daysAgo(3).toISOString(), proofImageUrl: null },
      { order: 2, description: "Visual inspection of jaw plates", completed: true, completedAt: daysAgo(3).toISOString(), proofImageUrl: "/uploads/wo-bh-3-step2.jpg" },
      { order: 3, description: "Check toggle plate and pitman bearing", completed: true, completedAt: daysAgo(3).toISOString(), proofImageUrl: null },
      { order: 4, description: "Adjust feed control to prevent oversize", completed: true, completedAt: daysAgo(3).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["PPE required", "Crusher must be stopped and locked out"],
    partsRequired: [],
    estimatedMinutes: 90,
    actualMinutes: 75,
    dueDate: daysAgo(2),
    completedAt: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "wo-pb-1",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-screen",
    alertId: "alert-pb-1",
    title: "Screen Bearing Replacement — Vibrating Screen",
    description: "Bearing clearance at limit. Schedule replacement during next maintenance window.",
    priority: "high",
    status: "open",
    assigneeId: "tm-sarah",
    steps: [
      { order: 1, description: "Order replacement bearings (2x FAG 22320)", completed: true, completedAt: daysAgo(1).toISOString(), proofImageUrl: null },
      { order: 2, description: "Schedule 8-hour maintenance window", completed: false, completedAt: null, proofImageUrl: null },
      { order: 3, description: "Remove screen panels and exciter housing", completed: false, completedAt: null, proofImageUrl: null },
      { order: 4, description: "Replace bearings and reassemble", completed: false, completedAt: null, proofImageUrl: null },
      { order: 5, description: "Run-in test and vibration measurement", completed: false, completedAt: null, proofImageUrl: null },
    ],
    safetyRequirements: ["Full LOTO procedure", "Crane required for exciter removal", "PPE including hearing protection"],
    partsRequired: ["FAG 22320 bearing (x2)", "Viton O-ring set", "Mobil SHC 632 oil (20L)"],
    estimatedMinutes: 480,
    actualMinutes: null,
    dueDate: daysFromNow(16),
    completedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "wo-kg-1",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-ventilation",
    alertId: "alert-kg-2",
    title: "Ventilation Fan Belt Replacement",
    description: "Routine belt replacement completed during scheduled maintenance window.",
    priority: "medium",
    status: "completed",
    assigneeId: "tm-james",
    steps: [
      { order: 1, description: "Isolate fan motor and apply LOTO", completed: true, completedAt: daysAgo(7).toISOString(), proofImageUrl: null },
      { order: 2, description: "Remove old belt and inspect pulleys", completed: true, completedAt: daysAgo(7).toISOString(), proofImageUrl: "/uploads/wo-kg-1-step2.jpg" },
      { order: 3, description: "Install new Continental 3V1060 belt", completed: true, completedAt: daysAgo(7).toISOString(), proofImageUrl: "/uploads/wo-kg-1-step3.jpg" },
      { order: 4, description: "Set tension to spec (150 Hz deflection frequency)", completed: true, completedAt: daysAgo(7).toISOString(), proofImageUrl: null },
      { order: 5, description: "Remove LOTO, start fan, verify airflow", completed: true, completedAt: daysAgo(7).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["LOTO required", "Confined space entry not required (surface unit)"],
    partsRequired: ["Continental 3V1060 belt"],
    estimatedMinutes: 120,
    actualMinutes: 95,
    dueDate: daysAgo(6),
    completedAt: daysAgo(7),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7),
  },
  {
    id: "wo-kg-2",
    siteId: "site-kalgoorlie",
    equipmentId: "eq-kg-dewater",
    alertId: "alert-kg-3",
    title: "Dewatering Pump Cavitation Fix",
    description: "Clear upstream blockage causing low water level and pump cavitation.",
    priority: "high",
    status: "completed",
    assigneeId: "tm-james",
    steps: [
      { order: 1, description: "Locate blockage in level 12 water channel", completed: true, completedAt: daysAgo(10).toISOString(), proofImageUrl: null },
      { order: 2, description: "Clear debris from channel intake", completed: true, completedAt: daysAgo(10).toISOString(), proofImageUrl: "/uploads/wo-kg-2-step2.jpg" },
      { order: 3, description: "Monitor pump for 1 hour to confirm normal operation", completed: true, completedAt: daysAgo(10).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["Underground work — gas monitor required", "Buddy system mandatory"],
    partsRequired: [],
    estimatedMinutes: 180,
    actualMinutes: 150,
    dueDate: daysAgo(9),
    completedAt: daysAgo(10),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: "wo-pb-2",
    siteId: "site-pilbara",
    equipmentId: "eq-pb-loader",
    alertId: "alert-pb-3",
    title: "Loader Hydraulic Fluid Top-Up",
    description: "Hydraulic reservoir at 62%. Top up and inspect for leaks.",
    priority: "low",
    status: "completed",
    assigneeId: "tm-sarah",
    steps: [
      { order: 1, description: "Check all hydraulic line connections for leaks", completed: true, completedAt: daysAgo(4).toISOString(), proofImageUrl: null },
      { order: 2, description: "Top up hydraulic fluid to sight glass level", completed: true, completedAt: daysAgo(4).toISOString(), proofImageUrl: "/uploads/wo-pb-2-step2.jpg" },
      { order: 3, description: "Record fluid volume added", completed: true, completedAt: daysAgo(4).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["Vehicle must be parked on level ground", "Engine off during service"],
    partsRequired: ["Cat HYDO Advanced 10W (40L)"],
    estimatedMinutes: 60,
    actualMinutes: 45,
    dueDate: daysAgo(3),
    completedAt: daysAgo(4),
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  },
  {
    id: "wo-dw-1",
    siteId: "site-darwin",
    equipmentId: "eq-dw-compressor",
    alertId: "alert-dw-1",
    title: "Post-Maintenance Compressor Verification",
    description: "Verify all operating parameters after scheduled compressor maintenance.",
    priority: "medium",
    status: "completed",
    assigneeId: "tm-emma",
    steps: [
      { order: 1, description: "Check discharge temperature at steady state", completed: true, completedAt: daysAgo(12).toISOString(), proofImageUrl: null },
      { order: 2, description: "Verify suction pressure within range", completed: true, completedAt: daysAgo(12).toISOString(), proofImageUrl: null },
      { order: 3, description: "Confirm vibration levels normal", completed: true, completedAt: daysAgo(12).toISOString(), proofImageUrl: null },
      { order: 4, description: "Sign off maintenance record", completed: true, completedAt: daysAgo(12).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["Gas detector required in compressor area", "No hot work within 25m"],
    partsRequired: [],
    estimatedMinutes: 60,
    actualMinutes: 50,
    dueDate: daysAgo(11),
    completedAt: daysAgo(12),
    createdAt: daysAgo(13),
    updatedAt: daysAgo(12),
  },
  {
    id: "wo-at-1",
    siteId: "site-atacama",
    equipmentId: "eq-at-tracker",
    alertId: "alert-at-1",
    title: "Solar Tracker Calibration — Row 12",
    description: "Recalibrate stow position on tracker row 12. 0.3\u00b0 drift detected.",
    priority: "low",
    status: "completed",
    assigneeId: "tm-alex",
    steps: [
      { order: 1, description: "Access tracker controller at row 12", completed: true, completedAt: daysAgo(6).toISOString(), proofImageUrl: null },
      { order: 2, description: "Run calibration routine", completed: true, completedAt: daysAgo(6).toISOString(), proofImageUrl: "/uploads/wo-at-1-step2.jpg" },
      { order: 3, description: "Verify stow position within 0.1\u00b0", completed: true, completedAt: daysAgo(6).toISOString(), proofImageUrl: null },
    ],
    safetyRequirements: ["Sun protection required", "Tracker must be in maintenance mode"],
    partsRequired: [],
    estimatedMinutes: 45,
    actualMinutes: 30,
    dueDate: daysAgo(5),
    completedAt: daysAgo(6),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(6),
  },
  {
    id: "wo-sv-1",
    siteId: "site-svalbard",
    equipmentId: "eq-sv-network",
    alertId: "alert-sv-1",
    title: "Network Link Restoration — Emergency",
    description: "Primary fiber and satellite backup both down. Dispatch emergency crew to inspect fiber landing station and satellite antenna.",
    priority: "critical",
    status: "open",
    assigneeId: "tm-li",
    steps: [
      { order: 1, description: "Inspect satellite antenna for storm damage", completed: false, completedAt: null, proofImageUrl: null },
      { order: 2, description: "Check fiber optic landing station", completed: false, completedAt: null, proofImageUrl: null },
      { order: 3, description: "Attempt manual satellite realignment", completed: false, completedAt: null, proofImageUrl: null },
      { order: 4, description: "If fiber damaged, deploy temporary splice", completed: false, completedAt: null, proofImageUrl: null },
      { order: 5, description: "Restore monitoring and verify all sensors reporting", completed: false, completedAt: null, proofImageUrl: null },
    ],
    safetyRequirements: ["Arctic weather gear required", "Buddy system mandatory", "Bear spray required outside buildings", "Radio check-in every 30 minutes"],
    partsRequired: ["Fiber splice kit", "Satellite antenna alignment tool", "Portable UHF radio"],
    estimatedMinutes: 360,
    actualMinutes: null,
    dueDate: daysFromNow(0),
    completedAt: null,
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },
];

// ── Sensor Reading Generation ───────────────────────────────────────

interface ReadingSpec {
  sensorId: string;
  hours: number;       // how many hours of history
  intervalMin: number; // interval in minutes between readings
  startValue: number;
  endValue: number;
  noiseAmp: number;
  // Optional spike parameters
  spikeAtHour?: number;
  spikeValue?: number;
  spikeDuration?: number; // in readings
}

function generateReadings(spec: ReadingSpec): { sensorId: string; value: number; timestamp: Date }[] {
  const results: { sensorId: string; value: number; timestamp: Date }[] = [];
  const totalReadings = Math.floor((spec.hours * 60) / spec.intervalMin);

  for (let i = 0; i < totalReadings; i++) {
    const t = i / (totalReadings - 1); // 0..1 progress
    const minutesAgo = (totalReadings - 1 - i) * spec.intervalMin;
    const timestamp = new Date(NOW.getTime() - minutesAgo * 60_000);

    // Base value: linear interpolation from start to end
    let value = spec.startValue + (spec.endValue - spec.startValue) * t;

    // Add deterministic noise
    value += noise(spec.noiseAmp);

    // Add spike if specified
    if (spec.spikeAtHour !== undefined && spec.spikeValue !== undefined) {
      const spikeReadingIndex = Math.floor((spec.spikeAtHour * 60) / spec.intervalMin);
      const spikeDur = spec.spikeDuration ?? 3;
      if (i >= spikeReadingIndex && i < spikeReadingIndex + spikeDur) {
        value = spec.spikeValue + noise(spec.noiseAmp * 0.5);
      }
    }

    // Clamp to reasonable range (never negative for most sensor types)
    value = Math.round(value * 100) / 100;

    results.push({ sensorId: spec.sensorId, value, timestamp });
  }

  return results;
}

const READING_SPECS: ReadingSpec[] = [
  // Broken Hill pump — THE STORY: temperature rising over 48 hours
  { sensorId: "sen-bh-pump-temp", hours: 48, intervalMin: 30, startValue: 120, endValue: 142, noiseAmp: 1.5 },
  // Vibration also trending up with spikes
  { sensorId: "sen-bh-pump-vib", hours: 48, intervalMin: 30, startValue: 4.5, endValue: 8.4, noiseAmp: 0.5, spikeAtHour: 36, spikeValue: 9.8, spikeDuration: 4 },
  // Flow dropping
  { sensorId: "sen-bh-pump-flow", hours: 48, intervalMin: 30, startValue: 95, endValue: 72, noiseAmp: 2.0 },
  // Pressure dropping slightly
  { sensorId: "sen-bh-pump-pressure", hours: 48, intervalMin: 30, startValue: 42, endValue: 38, noiseAmp: 0.8 },

  // Broken Hill crusher — stable with occasional spike
  { sensorId: "sen-bh-crusher-temp", hours: 48, intervalMin: 60, startValue: 68, endValue: 72, noiseAmp: 2.0 },
  { sensorId: "sen-bh-crusher-vib", hours: 48, intervalMin: 60, startValue: 8.5, endValue: 9.1, noiseAmp: 0.8, spikeAtHour: 45, spikeValue: 14.2, spikeDuration: 2 },

  // Broken Hill cooling — elevated
  { sensorId: "sen-bh-cool-temp", hours: 48, intervalMin: 60, startValue: 28, endValue: 33, noiseAmp: 1.0 },
  { sensorId: "sen-bh-cool-flow", hours: 48, intervalMin: 60, startValue: 400, endValue: 365, noiseAmp: 5.0 },

  // Pilbara screen — vibration trending up
  { sensorId: "sen-pb-screen-vib", hours: 48, intervalMin: 60, startValue: 10, endValue: 13.2, noiseAmp: 0.4 },
  { sensorId: "sen-pb-screen-temp", hours: 48, intervalMin: 60, startValue: 65, endValue: 76, noiseAmp: 2.0 },

  // Kalgoorlie hoist — stable
  { sensorId: "sen-kg-hoist-temp", hours: 48, intervalMin: 60, startValue: 75, endValue: 78, noiseAmp: 2.5 },
  { sensorId: "sen-kg-hoist-vib", hours: 48, intervalMin: 60, startValue: 2.8, endValue: 3.2, noiseAmp: 0.3 },

  // Darwin compressor — very stable
  { sensorId: "sen-dw-comp-temp", hours: 48, intervalMin: 60, startValue: 158, endValue: 162, noiseAmp: 2.0 },
  { sensorId: "sen-dw-comp-pressure", hours: 48, intervalMin: 60, startValue: 33, endValue: 33, noiseAmp: 0.5 },
  { sensorId: "sen-dw-tank-level", hours: 48, intervalMin: 60, startValue: 64, endValue: 67, noiseAmp: 0.3 },

  // Atacama — follows solar cycle (simplified: stable)
  { sensorId: "sen-at-inv-power", hours: 48, intervalMin: 60, startValue: 2200, endValue: 2340, noiseAmp: 50 },
  { sensorId: "sen-at-inv-temp", hours: 48, intervalMin: 60, startValue: 40, endValue: 42, noiseAmp: 1.5 },

  // Svalbard — readings stop 4 hours ago (comms lost)
  { sensorId: "sen-sv-ups-load", hours: 44, intervalMin: 60, startValue: 45, endValue: 45, noiseAmp: 2.0 },
  { sensorId: "sen-sv-cool-temp", hours: 44, intervalMin: 60, startValue: 18, endValue: 18, noiseAmp: 0.5 },
];

// ─── Main Seed Function ────────────────────────────────────────────

async function seed() {
  log("Starting database seed...");

  // ── Delete existing data (order matters for FK constraints) ──────
  log("Clearing existing data...");
  await db.delete(sensorReadings);
  await db.delete(workOrders);
  await db.delete(alerts);
  await db.delete(pois);
  await db.delete(cameraFeeds);
  await db.delete(sensors);
  await db.delete(equipment);
  await db.delete(teamMembers);
  await db.delete(sites);
  await db.delete(users);
  log("Cleared all tables.");

  // ── Insert users ─────────────────────────────────────────────────
  log("Inserting demo user...");
  const passwordHash = await hash("30gtcmVcq0jmA7Cxo58kl84fn3tE12ff", 12);
  await db
    .insert(users)
    .values({
      id: "user-george",
      username: "george",
      passwordHash,
      displayName: "George Sechu",
      role: "admin",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username: "george",
        passwordHash,
        displayName: "George Sechu",
        role: "admin",
      },
    });
  log("Inserted 1 user (george).");

  // ── Insert sites ─────────────────────────────────────────────────
  log("Inserting 6 sites...");
  await db.insert(sites).values(SITES);

  // ── Insert team members ──────────────────────────────────────────
  log("Inserting 8 team members...");
  await db.insert(teamMembers).values(TEAM);

  // ── Insert equipment ─────────────────────────────────────────────
  log(`Inserting ${EQUIPMENT.length} equipment items...`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(equipment).values(EQUIPMENT as any);

  // ── Insert sensors ───────────────────────────────────────────────
  log(`Inserting ${SENSORS.length} sensors...`);
  await db.insert(sensors).values(
    SENSORS.map((s) => ({
      ...s,
      lastReadingAt: NOW,
    }))
  );

  // ── Insert camera feeds ──────────────────────────────────────────
  log(`Inserting ${CAMERAS.length} camera feeds...`);
  await db.insert(cameraFeeds).values(CAMERAS);

  // ── Insert POIs ──────────────────────────────────────────────────
  log(`Inserting ${POIS.length} POIs...`);
  await db.insert(pois).values(POIS);

  // ── Insert alerts ────────────────────────────────────────────────
  log(`Inserting ${ALERTS.length} alerts...`);
  await db.insert(alerts).values(ALERTS);

  // ── Insert work orders ───────────────────────────────────────────
  log(`Inserting ${WORK_ORDERS.length} work orders...`);
  await db.insert(workOrders).values(WORK_ORDERS);

  // ── Generate and insert sensor readings ──────────────────────────
  log("Generating sensor readings...");
  let totalReadings = 0;

  for (const spec of READING_SPECS) {
    const readings = generateReadings(spec);
    totalReadings += readings.length;

    // Insert in batches of 500 to avoid query size limits
    const batchSize = 500;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      await db.insert(sensorReadings).values(batch);
    }
  }
  log(`Inserted ${totalReadings} sensor readings across ${READING_SPECS.length} sensors.`);

  // ── Done ─────────────────────────────────────────────────────────
  log("Seed complete!");
  log("");
  log("Summary:");
  log(`  Users:           1`);
  log(`  Sites:           ${SITES.length}`);
  log(`  Team Members:    ${TEAM.length}`);
  log(`  Equipment:       ${EQUIPMENT.length}`);
  log(`  Sensors:         ${SENSORS.length}`);
  log(`  Sensor Readings: ${totalReadings}`);
  log(`  Camera Feeds:    ${CAMERAS.length}`);
  log(`  POIs:            ${POIS.length}`);
  log(`  Alerts:          ${ALERTS.length}`);
  log(`  Work Orders:     ${WORK_ORDERS.length}`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] Error:", err);
    process.exit(1);
  });
