# NavStream

> Remote Facility Command Center — spatial-first operations platform for monitoring, operating, and maintaining remote facilities with immersive AR/VR, AI diagnostics, and real-time communications.

**Target users:** Companies servicing remote equipment (mines, oil rigs, data centers, solar farms) who want to reduce costly on-site engineer visits by giving back-office teams interactive visibility into field conditions.

---

## Status

| Sprint | Focus | Status |
|---|---|---|
| Sprint 0 | Infrastructure, DB, Auth, CI, Test Tooling | **In Progress** |
| Sprint 1 | Data Model, Wiring, Cross-Page Workflow | **Complete** |
| Sprint 2 | Streaming: Video, 360°, Thermal (WebRTC) | **Complete** |
| Sprint 3 | Real-Time Sensors, Alerts, Map | **Complete** |
| Sprint 4 | Communications (LiveKit), AI (Claude) | **In Progress** |
| Sprint 5 | Field Tech PWA, Polish, Demo Ready | **In Progress** |

**Target deployment:** `https://navstream.gsechu.net`
**Staging (LAN):** `http://192.168.1.100:3200` (macbook via colima Docker + Cloudflare tunnel)
**SSH access:** `ssh root@192.168.1.100` (LAN) or `ssh root@mbp-vpn` (VPN)
**Last updated:** 2026-07-16

**Test suite:** 139 tests (78 domain + 38 component + 19 hooks + 4 map) passing in ~1.6s

---

## The Problem

Today, when remote equipment fails:
1. Local operator calls HQ: "Something's wrong with pump 3"
2. HQ dispatches an engineer — **$5-15K per visit** (flights, accommodation, per diem, downtime)
3. Engineer arrives, diagnoses: "It's just a belt tension issue, someone on site could've fixed it"
4. Repeat 200x/year across multiple sites

**With NavStream:**
1. Equipment throws a sensor reading → alert appears in NavStream
2. Back-office engineer opens the site canvas, clicks the equipment POI
3. They see: live camera feed, thermal overlay, AI diagnostic suggestion, sensor history
4. They call the on-site technician via NavStream comms
5. Through shared 360° view + AR annotations, they guide the technician through the fix
6. Technician follows guided checklist, captures photo proof at each step
7. Work order auto-generated, signed off, logged — no travel needed

Every feature exists to serve this loop.

---

## Users

### 1. Back-Office Engineer (primary user)
- Sits at HQ with a big monitor (or two)
- Monitors multiple sites simultaneously
- Diagnoses problems remotely using cameras, sensors, thermal/IR, AI
- Guides field personnel through fixes via video call + AR annotations
- **Lives in NavStream all day** — the dashboard is their cockpit

### 2. On-Site Technician (field user)
- On their feet, using a tablet or phone (or AR headset in future)
- Receives instructions from back-office
- Executes guided checklists with photo/video proof capture at each step
- Carries 360° camera for virtual walkthroughs
- **Uses NavStream episodically** — when called or during routine rounds
- *Needs a separate mobile-optimized UI (future phase)*

### 3. Operations Manager (oversight user)
- Wants high-level dashboards: are my sites healthy?
- Reviews analytics, shift handovers, cost savings
- Approves work orders and staffing
- **Glances at NavStream a few times a day**

Current UI is built for User 1 (the power user). Field technician UX is future phase.

---

## Demo Scenario

### Demo Company: Meridian Mining Services
- Manages 6 remote mining/processing facilities across Australia and South America
- 44 field personnel, 8 back-office engineers
- Currently spends $2.1M/year on engineer travel

### The 5-Minute Walkthrough

**Scene 1 — Command Map (30s):** 6 sites on the map. 4 green, 1 amber (Pilbara — vibration warning), 1 red (Broken Hill — pump critical). Stats show 99.2% uptime, 3 active alerts, 44 personnel. "Let's look at that critical alert."

**Scene 2 — Site Canvas (45s):** Broken Hill floor plan with 12 POIs. Pump Station POI pulses red. Temperature rising, vibration anomaly, coolant flow dropping. Activity feed shows escalation: sensor warning → alert → auto-escalated to critical. "Let's diagnose remotely."

**Scene 3 — Imaging (45s):** Toggle to thermal view. Clear hotspot on bearing assembly — 142°C, 22°C above baseline. Timeline slider: scrub back 7 days, watch gradient develop. AI panel: "Early-stage bearing wear, 87% confidence. Recommend lubrication within 7 days."

**Scene 4 — Comms (60s):** Video call with David Okonkwo (on-site). Shared 360° view of pump station. Back-office drops AR annotations: circles bearing housing, arrows to grease fitting. Guided checklist appears on David's end: 6 steps with photo capture.

**Scene 5 — AI Assistant (45s):** "Generate a work order." AI produces: site, equipment, priority, assignee, safety requirements, parts. One-click approval.

**Scene 6 — Analytics (30s):** Diagnosis took 12 minutes, saved a $12K trip. Monthly: 23 remote resolutions, $180K saved this quarter.

### Demo Data Requirements

| Data | Quantity | Details |
|---|---|---|
| Sites | 6 | Real coordinates, floor plans, site photos |
| Equipment per site | 8-15 | Name, model, specs, sensor mappings, maintenance history |
| POIs per floor plan | 10-15 | Cameras, sensors, equipment, zones — linked to equipment |
| Sensor readings | ~100/equipment | Temperature, vibration, pressure, flow — realistic time series with trends |
| Alerts | 20-30 | Active/acknowledged/resolved, linked to equipment + sensors |
| Camera feeds | 9 | Simulated with looping video or realistic static frames |
| 360° panoramas | 5-8 | Equirectangular images (stock or AI-generated) |
| Thermal images | 4-6 | Simulated thermal overlays with realistic color gradients |
| Team members | 8-10 | Roles, site assignments, activity history, badges |
| Work orders | 10-15 | Open/completed, linked to equipment and alerts |
| AI chat threads | 3-5 | Realistic diagnostic conversations |
| Guided sessions | 3-4 | Step data with completion status and proof captures |

---

## Device & Camera Integration

### Camera Types

**IP Cameras (90% of market)** — nearly all support **ONVIF** (Open Network Video Interface Forum). Stream via **RTSP**. Major brands: Axis, Hikvision, Dahua, Bosch, Hanwha, Pelco. PTZ control standardized via ONVIF.

**Thermal/IR Cameras** — FLIR (Teledyne), Hikvision, Axis thermal models. Most support ONVIF for video. Radiometric data (actual temp per pixel) via FLIR A-series SDK or proprietary APIs.

**360° Cameras** — Insta360 (Pro 2, Titan), Ricoh Theta (Z1, X). Output standard equirectangular JPEG/PNG/MP4. Some support RTSP for live streaming (Insta360 Pro 2).

### Integration Architecture

```
[Cameras / Sensors / Devices]
    │
    ├── IP Cameras ──── RTSP/ONVIF ────┐
    ├── Thermal Cams ── RTSP + SDK ────┤
    ├── 360° Cameras ── RTSP / Upload ─┤
    └── IoT Sensors ─── MQTT ──────────┤
                                       ▼
                              [Media Gateway]
                              (on-site or cloud)
                              go2rtc / MediaMTX
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              ▼
                    WebRTC          HLS/MP4         MQTT
                  (live view)    (recordings)   (sensor data)
                        │              │              │
                        └──────────────┼──────────────┘
                                       ▼
                              [NavStream Backend]
                              Next.js API + WebSocket
                                       │
                                       ▼
                              [NavStream Frontend]
                              WebRTC player (live)
                              HLS player (recorded)
                              Three.js (360° panos)
                              Canvas API (thermal)
```

### Media Gateway Options

| Option | Type | Best for |
|---|---|---|
| **go2rtc** | Open-source, lightweight | Prototype + production. Handles RTSP→WebRTC, minimal overhead |
| **MediaMTX** | Open-source, Go-based | Alternative to go2rtc, good multi-protocol support |
| **Frigate** | Open-source NVR | If we want built-in AI object detection |
| **Custom (FFmpeg)** | Build our own | Full control, more work |

**Decision for prototype:** go2rtc or MediaMTX. Deploy as Docker container. For demo, loop pre-recorded video as RTSP streams.

### Sensor/IoT Integration

Facilities have temperature, vibration, pressure, flow, humidity sensors. These connect via:

- **MQTT** — standard IoT pub/sub protocol (our primary integration path)
- **Modbus / OPC-UA** — industrial protocols, bridged via Node-RED or Kepware to MQTT
- **REST APIs** — newer IoT platforms expose HTTP endpoints

**Decision:** MQTT broker as real-time data backbone. Topic structure: `{site}/{zone}/{equipment}/{sensor}`. For prototype, mock publisher generating realistic time-series data with trends and anomalies.

### What We Support

| Device Type | Integration Method | NavStream Capability |
|---|---|---|
| IP cameras | ONVIF/RTSP via media gateway → WebRTC | Live view, recording, PTZ control |
| Thermal cameras | ONVIF stream + FLIR SDK for radiometric | Visual stream + per-pixel temperature |
| 360° cameras | Equirectangular upload or RTSP live | Panorama viewer with hotspots |
| IoT sensors | MQTT subscription | Real-time gauges, sparklines, alerts |
| Technician phone/tablet | LiveKit WebRTC | Video call, shared camera, AR annotations |
| AR headsets | WebXR API in browser | Immersive 360° views (future) |

---

## Instant Field Terminal (QR Device Pairing)

Turn any smartphone into a live field camera + GPS tracker with zero app install.

### User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  BACK-OFFICE (Dashboard)                                            │
│                                                                     │
│  1. Engineer goes to Devices → "Create Field Device"                │
│  2. Sets: device name, assigned site, camera quality                │
│  3. System generates QR code containing:                            │
│     https://navstream.gsechu.net/field/{deviceId}?token={jwt}       │
│  4. QR displayed on screen or printed on a sticker                  │
│                                                                     │
│  5. Once scanned, device appears in dashboard:                      │
│     - Live video feed in Feeds page (alongside IP cameras)          │
│     - Moving GPS dot on Command Map                                 │
│     - Available as call target in Comms                             │
│     - Device status in Devices management panel                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  FIELD (Smartphone)                                                 │
│                                                                     │
│  1. Technician scans QR with phone camera                           │
│  2. Opens mobile webapp at /field/{deviceId}                        │
│  3. Browser prompts for camera + location permissions               │
│  4. Phone immediately starts publishing:                            │
│     - Camera feed → LiveKit room (WebRTC)                           │
│     - GPS coordinates → WebSocket/data channel (every 2s)           │
│     - Device orientation → data channel (for remote look-around)    │
│  5. Technician sees: viewfinder, connection status, battery level   │
│  6. Can install as PWA → app name comes from device config          │
│     e.g. "NavStream — Pump Station Cam"                             │
│                                                                     │
│  Optional features once connected:                                  │
│     - Receive video from back-office (bidirectional)                │
│     - See AR annotations drawn by back-office                       │
│     - Guided checklist with photo capture steps                     │
│     - Torch/flashlight toggle                                       │
│     - Front/back camera switch                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Technical Architecture

```
[Smartphone]                          [NavStream Server]
    │                                       │
    ├── getUserMedia() ──→ LiveKit Room ──→ Dashboard /feeds
    │   (camera + mic)     (WebRTC SFU)     (subscribe to track)
    │                                       │
    ├── watchPosition() ──→ WebSocket ────→ Dashboard /map
    │   (GPS coords)        or data channel  (update marker position)
    │                                       │
    ├── DeviceOrientation ─→ data channel ─→ Dashboard
    │   (compass heading)                    (optional: remote look)
    │                                       │
    └── Battery API ───────→ data channel ─→ Dashboard
        (charge level)                       (device status panel)
```

### Data Model

```typescript
interface FieldDevice {
  id: FieldDeviceId;         // e.g. "device-pump-cam-1"
  siteId: SiteId;            // assigned site
  name: string;              // "Pump Station Helmet Cam"
  token: string;             // JWT for auth (no login needed)
  status: "online" | "offline" | "pairing";
  lastSeenAt: Timestamp;
  currentLocation: Coordinates | null;
  currentHeading: number | null;  // compass degrees
  batteryLevel: number | null;    // 0-100
  cameraQuality: "low" | "medium" | "high";  // 360p / 720p / 1080p
  livekitRoomId: string;
  createdAt: Timestamp;
  createdBy: TeamMemberId;   // who created the device
}
```

### QR Code Design
- URL: `https://navstream.gsechu.net/field/{deviceId}?t={shortToken}`
- Token is a short-lived JWT (72h) that can be refreshed while the device is active
- QR can be regenerated from the dashboard if expired
- For permanent installations (e.g., hard hat mount), print QR as a sticker — token auto-refreshes on each connection

### PWA Manifest (Dynamic)
The `/field/{deviceId}` route serves a dynamic `manifest.json` with:
```json
{
  "name": "NavStream — Pump Station Cam",
  "short_name": "Pump Cam",
  "start_url": "/field/device-pump-cam-1?t=xxx",
  "display": "standalone",
  "theme_color": "#0a0e1a",
  "background_color": "#0a0e1a",
  "icons": [{ "src": "/logo.svg", "sizes": "any" }]
}
```
This means each device installs as a uniquely-named app on the home screen.

### Demo Scenario Addition
After Scene 4 (Comms), add:
> "And setting up a new field camera is this easy—" [scan QR with phone] → phone camera appears live in the feeds page within 3 seconds, GPS dot appears on the map at the phone's location. "Any smartphone becomes an instant field terminal."

---

## Known UX Gaps

Issues to address before the prototype is demoable:

1. **No workflow connectivity** — pages are independent islands. Alert should link to site → equipment → imaging → comms in a natural flow. Need cross-page context passing.
2. **No equipment data model** — POIs exist but aren't linked to equipment with sensors, cameras, specs, maintenance history. Need `Equipment → Sensor[]`, `Equipment → CameraFeed[]`, `Equipment → WorkOrder[]` relationships.
3. **No temporal depth** — everything is a snapshot. Need sensor history charts, event timelines, shift logs, before/after comparisons throughout.
4. **Floor plans are placeholder** — grid-pattern background won't convince anyone. Need at least one real-looking facility SVG.
5. **POI clicks are shallow** — hovering shows a tooltip, but clicking should open a rich detail panel with live sensor data, camera feed, equipment specs, maintenance history.
6. **Settings don't persist** — toggles reset on refresh. Use localStorage.
7. **No mobile layout** — field technicians use tablets. Current UI is desktop-only.

---

## What's Built

### App Shell & Theme
- [x] Next.js 16 + React 19 + Tailwind v4 scaffold
- [x] Dark cyberpunk theme (navy base, neon cyan/green/amber/magenta/red accents)
- [x] CSS custom properties for full palette (backgrounds, borders, text tiers, accents, shadows)
- [x] Glow effects, status pulse animations, scanline overlays, grid patterns
- [x] Inter (UI) + JetBrains Mono (data) typography
- [x] Collapsible sidebar with animated nav, accent-colored icons, active indicator bar
- [x] Top bar with live system status, alert badge, user avatar
- [x] Framer Motion page transitions and micro-interactions
- [x] Custom SVG logo (nav arrow + stream lines + pulse dot) with gradient wordmark
- [x] SVG favicon

### Command Palette (⌘K)
- [x] Global keyboard shortcut (⌘K / Ctrl+K)
- [x] Searches all pages + all sites
- [x] Keyboard navigation (↑↓ + Enter)
- [x] Grouped results (Navigation / Sites)
- [x] Wired to topbar search button

### Pages (12 routes)

| Route | Page | Status | Notes |
|---|---|---|---|
| `/` | Command Map | **UI built** | Stats bar (6 KPIs), map placeholder with animated markers, site cards. Needs: real Mapbox GL integration |
| `/sites` | Sites List | **UI built** | Table view, search, filter/add buttons. Needs: CRUD, database |
| `/sites/[id]` | Site Canvas | **UI built** | Floor plan with 6 POI markers, quick actions, activity feed. Needs: real floor plan upload, draggable POIs |
| `/feeds` | Live Feeds | **UI built** | 9-feed grid, 2x2/3x3/list layouts, LIVE/REC badges, scan effects. Needs: real WebRTC streams |
| `/viewer` | 360° Viewer | **UI built** | Panorama viewport, 4 hotspots, scene list, toolbar. Needs: Three.js equirectangular renderer |
| `/imaging` | Imaging & Diagnostics | **UI built** | Visible/Thermal/IR toggle, annotation toolbar, timeline slider, AI analysis panel. Needs: real canvas rendering |
| `/comms` | Communications | **UI built** | Video call UI, PiP, controls, contacts, guided sessions with progress. Needs: LiveKit integration |
| `/ai` | AI Assistant | **UI built** | Chat with Claude branding, mock diagnostic conversation, quick prompts, context panel. Needs: Claude API integration |
| `/alerts` | Alerts | **UI built** | Severity summary cards, filtered list (active/acknowledged/resolved). Needs: database, real-time |
| `/analytics` | Analytics | **UI built** | KPI cards with sparklines, radial gauges, bar charts, event timeline. Needs: real data |
| `/team` | Team | **UI built** | Member cards, sparkline activity, gamification (streak/rating/badges), leaderboard. Needs: database |
| `/settings` | Settings | **UI built** | Appearance (glow, animations, scanlines, accent picker), audio toggles. Needs: persistence |

### Shared Components

| Component | File | Purpose |
|---|---|---|
| `NavStreamLogo` | `src/components/ui/logo.tsx` | SVG logo with animated pulse + gradient wordmark |
| `CommandPalette` | `src/components/ui/command-palette.tsx` | ⌘K global search |
| `PageHeader` | `src/components/ui/page-header.tsx` | Consistent page title with accent bar |
| `StatusBadge` | `src/components/ui/status-badge.tsx` | Status pills (online/warning/critical/offline/live) |
| `GlowCard` | `src/components/ui/glow-card.tsx` | Animated card with neon hover glow |
| `RadialGauge` | `src/components/charts/radial-gauge.tsx` | SVG circular gauge with animated arc |
| `Sparkline` | `src/components/charts/sparkline.tsx` | SVG sparkline with gradient fill |
| `BarChart` | `src/components/charts/bar-chart.tsx` | Horizontal bar chart with animated fill |
| `AppShell` | `src/components/layout/app-shell.tsx` | Sidebar + topbar + content orchestrator |
| `Sidebar` | `src/components/layout/sidebar.tsx` | Collapsible nav with 8 main items + 3 bottom |
| `Topbar` | `src/components/layout/topbar.tsx` | Search, live status, alerts, user |
| `CommandMap` | `src/components/map/command-map.tsx` | Home page map + stats + site cards |
| `SiteDetailView` | `src/components/canvas/site-detail.tsx` | Site floor plan with POIs + actions |

### State Management
| Store | File | Contents |
|---|---|---|
| `useAppStore` | `src/stores/app-store.ts` | Sidebar state, active site, command palette, 6 demo sites |

---

## Roadmap to Demo

**Target:** Deployed prototype at `navstream.gsechu.net` with rich seed data, shareable login credentials, live-streaming media (including 360°), real-time sensor updates, and a guided walkthrough that sells the vision.

Each sprint ends with a **gate** — a set of checks that must pass before moving on. Gates include automated tests, manual verification, and deployment confirmation.

---

### Sprint 0 — Infrastructure & Foundation Hardening
*Get a deployable, testable baseline before adding features.*

- [ ] **VPS provisioning** — small VPS (4 vCPU, 8 GB RAM, 80 GB SSD). Ubuntu 24.04, Docker + Docker Compose installed
- [x] **Domain setup** — `navstream.gsechu.net` via Cloudflare tunnel to macbook staging
- [x] **Docker Compose stack** — services: `navstream-app`, `postgres`, `go2rtc`, `mosquitto` (MQTT broker), `caddy`
- [x] **PostgreSQL + Drizzle ORM** — schema for sites, equipment, sensors, alerts, work orders, users, sessions. Migrations via Drizzle Kit
- [x] **Auth (password-based)** — bcrypt + HMAC session tokens. HttpOnly cookie. Middleware protects all routes except `/`, `/login`, `/api/auth/*`. No external auth dependency
- [x] **Seed script** — `npm run seed` populates DB with full demo dataset (6 sites, 22 equipment, 20 sensors, ~1900 readings, 9 cameras, 51 POIs, 22 alerts, 11 work orders, 8 team members). Idempotent
- [x] **Demo account** — seeded: username `george`, password `30gtcmVcq0jmA7Cxo58kl84fn3tE12ff`
- [x] **Login page** — dark themed, animated, NavStream branding, username/password fields, error display, loading states
- [x] **Landing page** — public marketing page at `/` with hero, problem statement, 6-feature grid, 4-step how-it-works, animated stat counters, CTA to login
- [x] **CI/CD pipeline** — GitHub Actions: lint → typecheck → test:unit → test:components → build → deploy to VPS via SSH/Docker
- [x] **Install test tooling** — Vitest, @testing-library/react, vitest-axe, jsdom
- [x] **Extract domain logic** — 4 domain modules (alerts, sensors, equipment, analytics) with 20+ pure functions, 59 unit tests passing
- [x] **Add `data-testid`** — 87 data-testid attributes + 42 ARIA attributes across all 17 component files
- [x] **Test factories** — `createMockSite()`, `createMockAlert()`, `createMockEquipment()`, `createMockSensor()`, `createMockSensorReadings()`, `createMockWorkOrder()`, `createMockTeamMember()`
- [x] **Type system** — 9 type files with branded IDs (`SiteId`, `EquipmentId`, etc.), full interfaces for Site, Equipment, Sensor, Alert, WorkOrder, POI, CameraFeed, TeamMember

**Gate 0:**
- [x] `npm run build` passes
- [x] `npm run test:unit` passes (59 domain tests)
- [ ] `npm run lint && npm run typecheck` clean
- [x] App accessible at `https://navstream.gsechu.net` behind auth
- [x] `npm run seed` populates DB, app shows seeded data
- [x] Demo account can sign in (george / 30gtcmVcq0jmA7Cxo58kl84fn3tE12ff)

---

### Sprint 1 — Data Model, Wiring & Cross-Page Workflow
*Turn independent page islands into a connected operational tool.*

- [x] **Type system** — `types/` with Site, Equipment, Sensor, SensorReading, Alert, WorkOrder, CameraFeed, POI, TeamMember. Branded IDs (`SiteId`, `EquipmentId`)
- [x] **API routes** — 5 endpoints: GET sites, GET sites/[id] (with all relations), GET equipment/[id] (with sensors+readings+alerts+work orders), GET alerts (filterable), GET sensors/[id]/readings (time range)
- [x] **Equipment data model** — Equipment entity linked to sensors[], cameras[], workOrders[], maintenanceHistory[]. POIs linked to equipment
- [x] **Rich POI detail panel** — slide-out panel with sensor sparklines, active alerts, equipment specs, maintenance status, action buttons (thermal/call/work order). Animated with Framer Motion
- [x] **Pages wired to DB** — Command Map, Alerts, Sites list, and Site detail all fetch from API with graceful fallback. Hooks: `useSites()`, `useAlerts()`, `useSiteDetail()`, `useFetch()`
- [x] **Cross-page navigation with context** — alert card click → `/sites/{siteId}?equipment={equipmentId}` → POI highlighted → detail panel open. Imaging link carries equipment context. Comms link pre-selects site technician
- [x] **Sensor history charts** — line charts from real time-series data in DB, zoomable, with anomaly markers
- [x] **Settings persistence** — localStorage for appearance/audio toggles
- [x] **Detailed floor plan SVG** — realistic Broken Hill Processing facility layout: crusher room, conveyor hall, pump station, control room, offices, corridors, cameras, pipes, critical highlights
- [x] **Site CRUD** — add/edit/archive sites with name, type, coordinates, floor plan upload (SVG/PNG), timezone
- [x] **POI CRUD** — drag-to-place POIs on floor plans, assign type + linked equipment, edit/delete

**Gate 1:**
- [ ] E2E test: alert card → site canvas → POI click → detail panel shows correct sensor data
- [ ] E2E test: full demo walkthrough Scene 1 → 2 (command map → site canvas) navigable
- [x] Component tests for POI detail panel, sensor chart, equipment card (33 component tests)
- [x] Domain tests for `filterAlerts`, `sortBySeverity`, `computeUptime`, `detectAnomaly` (59 domain tests)
- [x] CRUD operations work end-to-end (create site → appears on map → click through to detail)
- [x] Deployed to staging with seeded data visible (http://192.168.1.100:3200)

---

### Sprint 2 — Streaming: Video, 360°, Thermal
*Real media replaces all placeholders. WebRTC everywhere.*

#### Streaming Architecture Decision

**WebRTC for everything.** George is right — it's the lowest-latency option for live delivery, and we can unify all stream types under one protocol:

| Stream type | Source | Gateway | Delivery | Player |
|---|---|---|---|---|
| IP camera feeds | RTSP from camera | go2rtc converts RTSP → WebRTC | WebRTC | `<video>` with `RTCPeerConnection` |
| 360° live stream | RTSP from Insta360/equirect camera | go2rtc converts RTSP → WebRTC | WebRTC | Three.js sphere mapping `<video>` texture |
| 360° recorded | Equirectangular MP4 file | Served as static/HLS | HLS or direct | Three.js sphere mapping `<video>` texture |
| Thermal camera | RTSP from FLIR/thermal cam | go2rtc converts RTSP → WebRTC | WebRTC | `<video>` + Canvas overlay for radiometric data |
| Technician call | Phone/tablet camera | LiveKit SFU (WebRTC native) | WebRTC | LiveKit React SDK `<VideoTrack>` |

**Why go2rtc (not MediaMTX):**
- Lighter footprint (single binary, ~10 MB)
- Native WebRTC output with WHEP standard
- Built-in multi-source: RTSP, RTMP, FFmpeg, file loops
- REST API for stream management (add/remove sources at runtime)
- Handles 360° equirectangular streams identically to flat streams — it's just video

**For the demo**, go2rtc loops pre-recorded video files as fake RTSP sources. Each "camera" is a looping MP4. We source:
- 5-6 industrial/facility surveillance clips (stock or CC-licensed)
- 2-3 equirectangular 360° videos (facility interiors from stock)
- 1-2 thermal/IR video clips or generated thermal overlays

#### Sprint 2 Tasks

- [x] **go2rtc Docker setup** — container in compose stack, configured with 9 demo streams (6 flat + 2 equirect-360 + 1 thermal-look). Loop MP4 files via FFmpeg source
- [x] **WebRTC player component** — generic `<WebRTCPlayer streamId={id} />` using WHEP protocol to connect to go2rtc. Handles ICE, reconnection (exponential backoff), error states, graceful fallback
- [x] **Live feeds page wired** — camera feeds from DB via `/api/cameras`, WebRTC player embedded in each tile, LIVE badge reflects actual connection state
- [x] **360° panorama viewer (Three.js)** — equirectangular texture mapped onto inverted sphere. Mouse drag rotation, scroll zoom FOV, touch support, auto-rotate. Dynamic import with `ssr: false`
- [x] **360° static panoramas** — procedural panorama generator (industrial, control-room, outdoor, pump-station scenes). 5 scenes with 17 hotspots across all scenes
- [x] **Hotspot system** — Three.js sprite-based hotspots positioned via lat/lng, raycaster click detection, type-based styling (navigation/info/alert), scene transitions on click
- [x] **Thermal canvas rendering** — Canvas API with Gaussian heat blobs, blue-to-red color mapping, animated shimmer, cursor temperature tracking with crosshair tooltip, vertical color scale bar
- [x] **Camera management API** — `/api/cameras` endpoint returning all feeds with site names
- [ ] **Source demo media** — acquire/create: 6 facility camera clips, 3 equirect 360° videos/images, 2 thermal-looking clips. Place in `media/` volume mounted into go2rtc

**Gate 2:**
- [ ] All 9 camera feeds stream live in the Feeds page via WebRTC (requires demo media in go2rtc — streams show graceful fallback until then)
- [x] 360° viewer renders equirectangular texture with smooth drag navigation
- [x] 360° hotspots navigate between scenes
- [x] Thermal overlay renders with color scale and cursor temperature readout
- [ ] E2E test: feeds page loads, all LIVE badges show connected state
- [ ] Component test: WebRTCPlayer handles connection/disconnection/error
- [x] Deployed: streams accessible at `navstream.gsechu.net/feeds`

---

### Sprint 3 — Real-Time Sensors & Alerts
*The dashboard comes alive — data moves, alerts fire, charts update.*

- [x] **Sensor simulator** — server-side singleton generating realistic sensor data every 5s. Broken Hill pump temperature drifts up, Pilbara vibration spikes, others stable with noise. Writes to DB and checks thresholds
- [x] **SSE endpoint** — `GET /api/sensors/live?siteId=xxx` streams sensor readings and alert events via Server-Sent Events. Heartbeat every 30s. Starts simulator lazily on first connection
- [x] **Live-updating client hook** — `useLiveSensors(siteId)` connects via EventSource, auto-reconnects with backoff, maintains Map of latest sensor values + recent alerts
- [x] **Threshold-based alerts** — uses `shouldTriggerAlert()` from domain logic. When sensor crosses threshold → creates alert in DB → pushes to SSE clients. Deduplication prevents alert spam
- [x] **Alert acknowledge/resolve** — `PATCH /api/alerts/[id]` with status transitions (active→acknowledged→resolved), timestamps, resolution notes. UI buttons with loading states and resolve notes modal
- [x] **Live connection indicator** — green pulsing dot on alerts page when SSE is connected, auto-refetch on new alerts
- [x] **Alert escalation** — simulator checks unacknowledged warnings every tick, escalates to critical after 5 minutes via `shouldEscalate()`. Emits escalation events on SSE stream
- [x] **Interactive world map** — custom SVG map with Mercator projection, real continent outlines, status-colored animated markers at actual lat/lng, hover tooltips, click-to-navigate. Replaced grid placeholder

**Gate 3:**
- [x] Sensor data arrives in real-time — POI markers update status colors live, sensor values animate in detail panel with LIVE badges
- [x] Alert fires automatically when simulator pushes temperature > threshold
- [x] Alert can be acknowledged and resolved through the UI
- [x] Map shows real site locations with animated markers, click navigates to site
- [x] Domain tests: `shouldTriggerAlert`, `shouldEscalate`, `interpolateTimeSeries` — 100% covered (92 tests)
- [ ] E2E test: wait for real-time alert to appear in alerts page without refresh
- [x] Deployed: real-time data flowing at `navstream.gsechu.net`

---

### Sprint 4 — Communications & AI
*Video calls between back-office and field. AI that understands the equipment.*

- [ ] **LiveKit server** — Docker container (LiveKit open-source SFU). Handles WebRTC rooms, tracks, signaling
- [ ] **LiveKit React integration** — join room, publish/subscribe video+audio tracks. Components: `<VideoCall>`, `<ParticipantTile>`, `<CallControls>`
- [x] **Call UI** — start call from comms page, clicking contact shows their info in call area. PiP, mic/camera toggles. Context-aware: reads `?site=` and `?equipment=` params
- [x] **All pages wired to DB** — Team, Analytics, Imaging context params all use real data. Analytics uses domain logic (costSavings, alertsBySite, avgResolutionTime, completionRate)
- [ ] **Shared camera view** — field technician's phone camera streams to back-office via LiveKit. Back-office can see what they see
- [x] **AR annotations on shared view** — Canvas overlay with pen/circle/arrow/text tools. Annotations sync between parties via signaling API. Neon glow rendering matching cyberpunk theme
- [x] **Guided session checklists** — work orders from DB shown as sessions with step progress. Mapped via `/api/work-orders` endpoint. Interactive: expand to see steps, toggle checkboxes, auto-updates status (open→in-progress→completed)
- [x] **Claude API integration** — AI chat with Claude API (falls back to smart keyword-based mock responses when no API key). System prompt positions as industrial diagnostics expert. Context-aware via URL params
- [x] **AI work order generation** — "Generate work order" → returns structured JSON → rendered as formatted work order card → "Save" button creates real work order in DB via `/api/work-orders` POST
- [ ] **Session recording** — LiveKit composite recording stored to S3/local volume. Playback in session history
- [x] **Instant Field Terminal (QR device pairing)** — device management API, QR code generation, field terminal mobile page with camera/GPS. Devices dashboard page with create/delete/QR modal

**Gate 4:**
- [x] Video call works between two browser tabs (simulating back-office ↔ field) — browser WebRTC with signaling API
- [x] Annotations drawn by one party appear on the other's view
- [x] Guided session: work orders displayed as sessions with step progress from DB
- [x] AI assistant responds with real equipment context (not generic text)
- [x] AI-generated work order saves to DB and appears in work orders list
- [x] QR scan → phone camera appears as live feed in dashboard within 5 seconds
- [ ] E2E test: start call → draw annotation → end call → verify session log
- [x] Deployed and functional at `navstream.gsechu.net`

---

### Sprint 5 — Field Technician PWA & Polish
*On-site experience. Final demo readiness.*

- [x] **PWA manifest + service worker** — installable PWA with NavStream branding, cache-first strategy, push notification handler. Manifest at `/manifest.webmanifest`
- [x] **Dynamic PWA naming** — field terminal at `/field/[deviceId]/manifest.json` generates per-device manifest with custom name from DB
- [x] **Technician mobile UI** — `/field/[deviceId]` route: camera viewfinder, GPS tracking, battery status, connection indicator. Dark theme, large touch targets, standalone (no sidebar)
- [ ] **Photo/video capture** — camera access via `getUserMedia`. Capture image → attach to checklist step or work order. Upload to S3 bucket
- [ ] **Push notifications** — browser push for incoming calls and critical alerts when app is backgrounded
- [ ] **Thin Android wrapper (if needed)** — Trusted Web Activity (TWA) wrapping the PWA for Play Store distribution. Only if PWA camera/notification APIs prove insufficient on target devices
- [x] **Analytics wired to real data** — KPI cards, bar charts, sparklines compute from actual DB data. Cost savings computed from `remoteResolutions × avgTripCost`
- [x] **Shift handover report** — AI queries real DB data (alerts + work orders from last 8h), generates structured markdown report with events, active issues, completed work, recommendations. Button on analytics page
- [x] **Visual polish pass** — loading skeletons, empty states, error boundaries, page transitions, POI flash animations, live alert badges
- [ ] **Demo walkthrough mode** — optional guided overlay that walks through the 5-minute demo scenario with annotations and highlights (for self-guided demos)

**Gate 5 (Demo Ready):**
- [ ] Full demo walkthrough (all 6 scenes) works end-to-end without errors
- [ ] PWA installs on Android phone with custom device name, receives push notification for critical alert
- [ ] QR code demo: scan QR on phone → phone camera appears in dashboard → GPS dot moves on map
- [ ] Technician can complete guided checklist with photo capture on mobile
- [ ] Video call works between desktop (back-office) and mobile (field tech)
- [ ] 360° stream viewable on desktop AND mobile
- [ ] All 3 demo accounts have appropriate role-based views
- [ ] Analytics show computed data from seed + live activity
- [ ] E2E test suite: ≥20 tests covering all major workflows, all green
- [ ] Visual regression snapshots for all 12 pages
- [ ] Domain test coverage ≥ 95%
- [ ] Performance: initial load < 3s on 4G, stream start < 1s on broadband
- [ ] Deployed, seeded, stable at `https://navstream.gsechu.net`

---

### Post-Demo Backlog

Features not needed for demo but on the roadmap:

- [ ] **Geo-registration** — drag/rotate/scale floor plan overlay on map to match ground truth
- [ ] **Facility perimeters** — draw polygons on map for site boundaries
- [ ] **3D equipment viewer** — React Three Fiber glTF/GLB viewer with interactive parts, exploded views
- [ ] **Image comparison** — side-by-side current vs. baseline thermal images
- [ ] **Annotation persistence** — save drawings/markers per image to DB
- [ ] **WebXR / VR headset support** — same 360° views accessible in VR
- [ ] **AR overlay mode** — technician points device at equipment → sees diagnostic overlays
- [ ] **Digital twin** — full 3D facility with live sensor data mapped to equipment
- [ ] **Drone integration** — ingest drone footage, overlay on map
- [ ] **Multi-tenant** — org isolation, role-based access per site
- [ ] **Gamification persistence** — leaderboards, badges, streaks backed by DB
- [ ] **Sound design** — audio cues for alerts, connections (toggleable)
- [ ] **Proper domain** — move to production domain when ready

---

## Tech Stack

| Layer | Technology | Status | Sprint |
|---|---|---|---|
| Frontend | Next.js 16 + React 19 | **Installed** | — |
| UI | Tailwind CSS v4 + Radix UI + Framer Motion | **Installed** | — |
| State | Zustand | **Installed** | — |
| Icons | Lucide React | **Installed** | — |
| Utilities | clsx + tailwind-merge + class-variance-authority | **Installed** | — |
| Testing | Vitest + Testing Library + Playwright | **Installed** | S0 |
| Database | PostgreSQL + PostGIS (Drizzle ORM) | **Schema done** | S0 |
| Auth | Clerk | Not installed | S0 |
| Maps | Mapbox GL JS | Not installed | S3 |
| 3D / 360° | Three.js (equirect sphere renderer) | Not installed | S2 |
| Media Gateway | **go2rtc** (RTSP→WebRTC via WHEP) | Not installed | S2 |
| Video/Comms | **LiveKit** (person-to-person WebRTC SFU) | Not installed | S4 |
| Real-time | Mosquitto (MQTT) + WebSocket bridge | Not installed | S3 |
| AI | Claude API (Anthropic SDK) | Not installed | S4 |
| Storage | MinIO (S3-compatible, self-hosted) | Not installed | S4 |
| Reverse Proxy | Caddy (auto-TLS) | Not installed | S0 |

### Deployment Architecture

```
navstream.gsechu.net (VPS — 4 vCPU / 8 GB RAM / 80 GB SSD)
│
├── Caddy (reverse proxy, auto-TLS)
│   ├── navstream.gsechu.net       → navstream-app:3000
│   ├── navstream.gsechu.net/whep/ → go2rtc:8555 (WebRTC signaling)
│   └── navstream.gsechu.net/lk/   → livekit:7880 (LiveKit signaling)
│
├── navstream-app (Next.js — app + API)
│   ├── Port 3000
│   ├── Connects to: postgres, mosquitto, go2rtc API, livekit API, minio
│   └── Serves: dashboard, API routes, WebSocket bridge
│
├── postgres (PostgreSQL 16 + PostGIS)
│   ├── Port 5432 (internal only)
│   └── Volumes: pgdata
│
├── go2rtc (media gateway)
│   ├── Port 8555 (WHEP/WebRTC signaling)
│   ├── Port 1984 (admin API)
│   ├── Sources: looping MP4 files via FFmpeg
│   └── Volumes: media/ (demo video files)
│
├── mosquitto (MQTT broker)
│   ├── Port 1883 (internal only)
│   └── mock-publisher sidecar: generates sensor data
│
├── livekit (WebRTC SFU — Sprint 4)
│   ├── Port 7880 (signaling)
│   ├── UDP 50000-60000 (media)
│   └── Handles: video calls, screen share, recording
│
└── minio (S3-compatible storage — Sprint 4)
    ├── Port 9000 (internal only)
    └── Buckets: media-uploads, session-recordings, thermal-captures
```

### Streaming Protocol Decision

**WebRTC for all live media delivery.** Two engines, two purposes:

| Engine | Purpose | Protocol | Latency |
|---|---|---|---|
| **go2rtc** | Camera/device streams (IP cams, 360° cams, thermal cams) | WHEP (WebRTC-HTTP Egress Protocol) | < 300ms |
| **LiveKit** | Person-to-person calls (back-office ↔ field technician) | WebRTC via SFU | < 200ms |

**Why not HLS/DASH?** 3-15 second latency. Unacceptable for live diagnostics and guided repairs. HLS is only used for recorded playback/scrubbing.

**Why WHEP?** It's the emerging standard for WebRTC playback (view-only). Simpler than full WebRTC signaling — just an HTTP POST to get an SDP offer. go2rtc supports it natively. Our `<WebRTCPlayer>` component speaks WHEP.

**360° streaming specifics:** A 360° camera outputs equirectangular video. This is delivered identically to a flat camera stream via WebRTC. The only difference is on the frontend: instead of rendering the `<video>` element directly, we map it as a texture onto the inside of a Three.js sphere. The user drags to look around. Same stream, different renderer.

### Field Technician Clients

| Approach | Use case | Effort |
|---|---|---|
| **PWA (primary)** | Guided checklists, camera capture, receive calls, view floor plans, push notifications | Medium — works on iOS Safari + Android Chrome. `getUserMedia` for camera, `Push API` for notifications |
| **TWA (Android wrapper)** | Play Store distribution of the PWA if needed for enterprise MDM deployment | Low — Trusted Web Activity, just wraps the PWA |
| **Native Android (only if needed)** | Hardware-specific features PWA can't access: USB peripherals, background BLE for sensors, raw camera2 API for advanced capture | High — only build if PWA hits a hard limitation |

**Decision:** Start with PWA. Build Android native only if we hit a capability wall (most likely: background sensor scanning or advanced camera control). iOS will use PWA via Safari (works well since iOS 16.4+ for push).

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── ai/page.tsx              # AI Assistant
│   │   ├── alerts/page.tsx          # Alerts center
│   │   ├── analytics/page.tsx       # Analytics dashboard
│   │   ├── comms/page.tsx           # Communications / video calls
│   │   ├── feeds/page.tsx           # Live camera feeds
│   │   ├── imaging/page.tsx         # Thermal / IR imaging
│   │   ├── settings/page.tsx        # App settings
│   │   ├── sites/
│   │   │   ├── page.tsx             # Sites list
│   │   │   └── [id]/page.tsx        # Site detail (canvas + POIs)
│   │   ├── team/page.tsx            # Team management
│   │   └── viewer/page.tsx          # 360° panorama viewer
│   ├── globals.css                  # Theme tokens + animations
│   ├── layout.tsx                   # Root layout (fonts, metadata)
│   └── page.tsx                     # Home → Command Map
├── components/
│   ├── canvas/site-detail.tsx       # Site floor plan + POI markers
│   ├── charts/
│   │   ├── bar-chart.tsx            # Horizontal bar chart
│   │   ├── radial-gauge.tsx         # Circular gauge
│   │   └── sparkline.tsx            # Inline sparkline
│   ├── layout/
│   │   ├── app-shell.tsx            # Shell orchestrator
│   │   ├── sidebar.tsx              # Collapsible sidebar nav
│   │   └── topbar.tsx               # Top bar
│   ├── map/command-map.tsx          # Command Map home view
│   └── ui/
│       ├── command-palette.tsx      # ⌘K search
│       ├── glow-card.tsx            # Neon hover card
│       ├── logo.tsx                 # SVG logo + wordmark
│       ├── page-header.tsx          # Page title component
│       └── status-badge.tsx         # Status pills
├── db/
│   ├── schema.ts                    # Drizzle ORM schema (8 tables)
│   └── seed.ts                      # Idempotent seed script (~2000 lines)
├── domain/                          # Pure business logic (no React)
│   ├── alerts.ts                    # filterAlerts, sortBySeverity, shouldEscalate
│   ├── analytics.ts                 # computeCostSavings, alertsBySite, completionRate
│   ├── equipment.ts                 # computeUptime, deriveEquipmentStatus
│   ├── sensors.ts                   # detectAnomaly, shouldTriggerAlert, movingAverage, rateOfChange
│   └── __tests__/                   # 59 unit tests
├── types/                           # Branded types, interfaces (no runtime code)
│   ├── common.ts                    # SiteId, EquipmentId, etc.
│   ├── site.ts, equipment.ts, sensor.ts, alert.ts, work-order.ts, poi.ts, camera.ts, team.ts
│   └── index.ts                     # Re-exports all types
├── test/
│   ├── factories/index.ts           # createMockSite(), createMockAlert(), etc.
│   └── helpers/setup.ts             # Vitest setup (jest-dom)
├── lib/utils.ts                     # cn() utility
└── stores/app-store.ts              # Zustand global state

# Infrastructure (project root)
├── docker-compose.yml               # 5-service stack
├── Dockerfile                        # Multi-stage Next.js build
├── Caddyfile                         # Reverse proxy + TLS
├── go2rtc.yaml                       # 9 demo camera streams
├── mosquitto.conf                    # MQTT broker config
├── drizzle.config.ts                 # Drizzle Kit config
├── vitest.config.ts                  # Test runner config
└── .github/workflows/ci.yml         # CI pipeline
```

---

## UX Direction

| Aspect | Direction |
|---|---|
| Theme | Dark mode only. Deep navy (#0a0e1a), neon accents (cyan, amber, magenta, green, red) |
| Aesthetic | "Mission control meets cyberpunk" — Valorant UI × Bloomberg Terminal |
| Animations | Smooth fly-ins, glowing pulses, spring-animated indicators, sparkline draws |
| Typography | Inter (UI), JetBrains Mono (data/monospace) |
| Data viz | Glowing sparklines, radial gauges, animated bar charts |
| Sound | Subtle audio cues for alerts/connections (toggleable) — not yet implemented |
| Gamification | Leaderboards, streaks, badges — UI built, persistence pending |

---

## Engineering Principles

### Architecture: Separate Everything

The guiding rule is **UI components are thin shells**. All logic lives in testable, import-able units that never touch the DOM.

```
┌─────────────────────────────────────────────────────────────┐
│  Page (app/alerts/page.tsx)                                  │
│  ↓ composes feature components, passes no logic down         │
├─────────────────────────────────────────────────────────────┤
│  Feature Component (components/alerts/alert-list.tsx)        │
│  ↓ renders UI from props/hooks, contains zero logic          │
├─────────────────────────────────────────────────────────────┤
│  Hooks (hooks/use-alerts.ts)                                 │
│  ↓ orchestrate domain logic + data, return shaped data       │
├─────────────────────────────────────────────────────────────┤
│  Domain Logic (domain/alerts.ts)                             │
│  ↓ pure functions, no React, no browser APIs                 │
├─────────────────────────────────────────────────────────────┤
│  Data Access (services/alert-service.ts)                     │
│  ↓ fetch/mutate, injected via providers or passed to hooks   │
├─────────────────────────────────────────────────────────────┤
│  Types (types/alerts.ts)                                     │
│  ↓ shared interfaces, enums, branded types                   │
└─────────────────────────────────────────────────────────────┘
```

Every layer is independently testable:

| Layer | Tested with | Runs in |
|---|---|---|
| **Domain logic** (`domain/`) | Vitest, plain assertions | Node — no browser needed |
| **Hooks** (`hooks/`) | `@testing-library/react-hooks` or Vitest with `renderHook` | jsdom |
| **Components** (`components/`) | `@testing-library/react` — render, assert on `data-testid` | jsdom |
| **E2E flows** | Playwright — full browser, real interactions | Chromium/Firefox/WebKit |

### Directory Structure (target)

```
src/
├── app/                        # Next.js routes — thin page shells only
├── components/                 # UI components — render from props, no logic
│   ├── ui/                     # Generic primitives (GlowCard, StatusBadge)
│   ├── charts/                 # Data viz (Sparkline, RadialGauge)
│   ├── layout/                 # App shell (Sidebar, Topbar)
│   └── [feature]/              # Feature-specific (alerts/, sites/, feeds/)
├── hooks/                      # React hooks — orchestrate domain + data
│   ├── use-alerts.ts
│   ├── use-sites.ts
│   ├── use-sensor-data.ts
│   └── use-settings.ts
├── domain/                     # Pure business logic — zero imports from React
│   ├── alerts.ts               # filterAlerts(), sortBySeverity(), shouldEscalate()
│   ├── sensors.ts              # detectAnomaly(), interpolateTimeSeries(), thresholdCheck()
│   ├── equipment.ts            # getMaintenanceStatus(), calculateUptime()
│   ├── work-orders.ts          # generateWorkOrder(), validateWorkOrder()
│   └── analytics.ts            # computeKPIs(), trendAnalysis(), costSavings()
├── services/                   # Data access — API calls, WebSocket, MQTT
│   ├── api-client.ts           # HTTP client with typed endpoints
│   ├── ws-client.ts            # WebSocket connection manager
│   └── mqtt-client.ts          # MQTT subscription manager
├── types/                      # Shared TypeScript types — no runtime code
│   ├── site.ts
│   ├── equipment.ts
│   ├── sensor.ts
│   ├── alert.ts
│   └── work-order.ts
├── stores/                     # Zustand stores — thin, delegates to domain/
├── lib/                        # Utilities (cn, formatters, validators)
└── test/                       # Test utilities, fixtures, factories
    ├── factories/              # createMockSite(), createMockAlert(), etc.
    ├── fixtures/               # Static JSON demo data
    └── helpers/                # renderWithProviders(), mockWebSocket(), etc.
```

### Domain Logic: Pure Functions, No React

Everything that can be a pure function **must** be a pure function. These go in `domain/` and are the most valuable tests we write — fast, deterministic, no mocking.

```typescript
// domain/sensors.ts — runs in Node, no React, no DOM
export function detectAnomaly(
  readings: SensorReading[],
  baseline: number,
  thresholdDelta: number
): AnomalyResult | null { ... }

export function interpolateTimeSeries(
  readings: SensorReading[],
  interval: Duration
): InterpolatedPoint[] { ... }

export function shouldTriggerAlert(
  current: number,
  thresholds: AlertThresholds
): AlertSeverity | null { ... }

// domain/alerts.ts
export function filterAlerts(
  alerts: Alert[],
  filters: AlertFilters
): Alert[] { ... }

export function sortBySeverity(alerts: Alert[]): Alert[] { ... }

export function escalationPath(alert: Alert): EscalationStep[] { ... }

// domain/analytics.ts
export function computeCostSavings(
  remoteResolutions: Resolution[],
  avgTripCost: number
): CostSavingsReport { ... }
```

**Rule:** If a function doesn't need `useState`, `useEffect`, or any browser API, it goes in `domain/`, not in a component or hook.

### Hooks: Orchestration Layer

Hooks combine domain logic + data access + React state. They return shaped data and action handlers — never raw API responses.

```typescript
// hooks/use-alerts.ts
export function useAlerts(filters: AlertFilters) {
  const { data, isLoading } = useQuery(['alerts'], fetchAlerts);

  // Domain logic — pure, testable separately
  const filtered = data ? filterAlerts(data, filters) : [];
  const sorted = sortBySeverity(filtered);
  const criticalCount = sorted.filter(a => a.severity === 'critical').length;

  const acknowledge = useMutation(acknowledgeAlert);

  return { alerts: sorted, criticalCount, isLoading, acknowledge };
}
```

**Testing:** Use `renderHook` with mocked services. Assert on return values, not DOM.

### Components: Thin, Props-Driven, Tagged for Testing

Components receive data via props or hooks, render UI, and **contain no logic** beyond simple conditional rendering.

#### `data-testid` Convention

Every interactive or assertable element gets a `data-testid`. The naming convention is hierarchical:

```
data-testid="{feature}-{component}-{element}"
```

Examples:
```
data-testid="alert-list"
data-testid="alert-card-{id}"
data-testid="alert-card-{id}-severity"
data-testid="alert-card-{id}-acknowledge-btn"
data-testid="site-canvas-poi-{id}"
data-testid="feeds-grid"
data-testid="feeds-layout-toggle-3x3"
data-testid="command-palette-input"
data-testid="command-palette-result-{id}"
data-testid="sidebar-nav-{route}"
data-testid="topbar-alert-badge"
data-testid="sensor-sparkline-{sensorId}"
data-testid="imaging-spectrum-toggle-thermal"
data-testid="comms-call-btn"
data-testid="comms-contact-{id}"
```

**Rules:**
- Every clickable element has a `data-testid`
- Every element whose content we assert on has a `data-testid`
- Lists have a `data-testid` on the container and each item
- Use the ID of the data entity in the `data-testid` where applicable
- Stateful toggles include their current state in ARIA (`aria-pressed`, `aria-expanded`, `aria-selected`)

#### Accessible Roles

Complement `data-testid` with proper ARIA roles so tests can also query by role (preferred by Testing Library):

```typescript
// Good — testable by role AND testid
<button role="button" aria-label="Acknowledge alert" data-testid={`alert-card-${id}-acknowledge-btn`}>
<nav role="navigation" aria-label="Main navigation" data-testid="sidebar-nav">
<dialog role="dialog" aria-label="Command palette" data-testid="command-palette">
<table role="table" aria-label="Sites list" data-testid="sites-table">
```

### Test Strategy

#### Unit Tests (Vitest — `domain/`, `lib/`)

- **What:** Pure functions, formatters, validators, domain logic
- **Where:** `*.test.ts` co-located with source or in `__tests__/`
- **Speed:** < 1ms per test, entire suite < 5s
- **Coverage target:** 95%+ on `domain/` and `lib/`
- **No mocking** — these are pure functions with no dependencies
- **Run:** `npm test` (watch), `npm run test:unit` (CI)

```typescript
// domain/__tests__/sensors.test.ts
describe('detectAnomaly', () => {
  it('returns null when readings are within threshold', () => { ... });
  it('returns anomaly with correct severity when delta exceeds threshold', () => { ... });
  it('handles empty readings array', () => { ... });
  it('uses most recent reading against baseline', () => { ... });
});
```

#### Component Tests (Vitest + Testing Library — `components/`)

- **What:** Components render correctly, respond to interactions, display correct data
- **Where:** `*.test.tsx` co-located with component
- **Speed:** < 100ms per test
- **No network calls** — all data via props or mocked hooks
- **Assert on:** `data-testid`, ARIA roles, visible text, accessibility
- **Run:** `npm run test:components`

```typescript
// components/alerts/__tests__/alert-card.test.tsx
describe('AlertCard', () => {
  it('renders severity icon and title', () => {
    render(<AlertCard alert={createMockAlert({ severity: 'critical' })} />);
    expect(screen.getByTestId('alert-card-alert-1-severity')).toHaveTextContent('critical');
  });

  it('calls onAcknowledge when button clicked', async () => {
    const onAck = vi.fn();
    render(<AlertCard alert={mockAlert} onAcknowledge={onAck} />);
    await userEvent.click(screen.getByTestId('alert-card-alert-1-acknowledge-btn'));
    expect(onAck).toHaveBeenCalledWith('alert-1');
  });

  it('is accessible', async () => {
    const { container } = render(<AlertCard alert={mockAlert} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

#### Hook Tests (Vitest + renderHook — `hooks/`)

- **What:** Hooks return correct shaped data, handle loading/error states, call services correctly
- **Where:** `hooks/__tests__/`
- **Mock:** Services and API clients, **not** domain logic
- **Run:** `npm run test:hooks`

```typescript
// hooks/__tests__/use-alerts.test.ts
describe('useAlerts', () => {
  it('returns filtered and sorted alerts', async () => {
    mockFetchAlerts.mockResolvedValue(mockAlerts);
    const { result } = renderHook(() => useAlerts({ status: 'active' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.alerts).toHaveLength(3);
    expect(result.current.alerts[0].severity).toBe('critical'); // sorted first
  });
});
```

#### E2E Tests (Playwright — full workflows)

- **What:** Complete user flows matching the demo scenario
- **Where:** `e2e/`
- **Browser:** Chromium, Firefox, WebKit (all three in CI)
- **Selectors:** `data-testid` primary, ARIA role secondary — **never** CSS classes
- **Run:** `npm run test:e2e`

```typescript
// e2e/demo-workflow.spec.ts
test.describe('Demo Walkthrough', () => {
  test('Scene 1 → 2: Command Map → Site Canvas', async ({ page }) => {
    await page.goto('/');
    // Command Map loads with 6 sites
    await expect(page.getByTestId('command-map-stats-total-sites')).toHaveText('6');
    // Click critical site card
    await page.getByTestId('site-card-site-3').click();
    // Navigated to site detail
    await expect(page).toHaveURL('/sites/site-3');
    await expect(page.getByTestId('site-canvas')).toBeVisible();
    // POI is visible and pulsing
    await expect(page.getByTestId('site-canvas-poi-poi-4')).toBeVisible();
  });

  test('Scene 2 → 3: Site Canvas → Imaging', async ({ page }) => {
    await page.goto('/sites/site-3');
    await page.getByTestId('quick-action-thermal').click();
    await expect(page).toHaveURL(/imaging/);
    await expect(page.getByTestId('imaging-spectrum-toggle-thermal')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Full alert resolution flow', async ({ page }) => {
    await page.goto('/alerts');
    await page.getByTestId('alert-card-alert-1').click();
    // Navigates to site → equipment context
    await expect(page.getByTestId('site-canvas')).toBeVisible();
    // Open comms
    await page.getByTestId('quick-action-call').click();
    await expect(page.getByTestId('comms-call-btn')).toBeVisible();
  });
});
```

#### Visual Regression (Playwright screenshots)

- **What:** Catch unintended visual changes to key views
- **Where:** `e2e/visual/`
- **Snapshots:** Command Map, Site Canvas, Feeds Grid, Imaging Thermal, Analytics Dashboard
- **Run:** `npm run test:visual`

### Test Factories & Fixtures

All tests share a single source of mock data generation:

```typescript
// test/factories/index.ts
export function createMockSite(overrides?: Partial<Site>): Site { ... }
export function createMockEquipment(overrides?: Partial<Equipment>): Equipment { ... }
export function createMockAlert(overrides?: Partial<Alert>): Alert { ... }
export function createMockSensorReadings(
  count: number,
  opts?: { trend?: 'rising' | 'stable' | 'falling', noise?: number }
): SensorReading[] { ... }
export function createMockWorkOrder(overrides?: Partial<WorkOrder>): WorkOrder { ... }
```

Factories produce valid, consistent data by default. Tests override only the fields they care about.

### CI Pipeline

```
npm run lint          → ESLint
npm run typecheck     → tsc --noEmit
npm run test:unit     → Vitest (domain/, lib/)
npm run test:hooks    → Vitest (hooks/)
npm run test:components → Vitest + Testing Library (components/)
npm run test:e2e      → Playwright (e2e/)
npm run test:visual   → Playwright screenshot comparison (e2e/visual/)
npm run build         → Next.js production build
```

All must pass before merge. Tests run in parallel where possible. Unit + hook + component tests target < 30s total. E2E targets < 2 minutes.

### Code Reusability Principles

1. **Generic before specific** — build `GlowCard`, `StatusBadge`, `Sparkline` as generic, then use in feature components. Never inline a UI pattern that appears twice.

2. **Composition over configuration** — components accept `children` and render slots, not 15 boolean props. A `Panel` component with header/body/footer slots beats a `Panel` with `showHeader`, `showFooter`, `headerLeft`, `headerRight`.

3. **Hooks extract, don't abstract** — a hook like `useAlerts` extracts a specific concern. Don't build a `useGenericDataFetcher<T>` — use `react-query`/`swr` directly and keep hooks feature-specific.

4. **Types are documentation** — every entity has a type file in `types/`. Discriminated unions for status/severity, branded types for IDs (`SiteId`, `EquipmentId`), and explicit `null` handling — no `any`.

5. **Co-locate tests** — test files live next to source files (`alert-card.tsx` → `alert-card.test.tsx`), except E2E which lives in `e2e/`.

6. **No default exports** — named exports everywhere for better refactoring, searchability, and tree-shaking.

### Current Test Debt

- [x] **Install test tooling** — Vitest, @testing-library/react, vitest-axe, jsdom
- [x] **Add `data-testid` to all existing components** — 87 attributes across 17 files
- [x] **Add ARIA roles/labels to existing components** — 42 ARIA attributes
- [x] **Extract domain logic from components** — 4 domain modules, 20+ pure functions
- [ ] **Extract hooks from page components** — move `useState`/data orchestration into `hooks/`
- [x] **Write factories** — 7 factory functions covering all entity types
- [x] **First unit tests** — 59 domain tests passing in < 1s
- [ ] **First component tests** — `StatusBadge`, `GlowCard`, `Sparkline` (simple, reused everywhere)
- [ ] **First E2E test** — happy path: load command map → click site → see canvas
- [x] **CI pipeline** — GitHub Actions running lint + typecheck + all tests on every push

---

## Dev Notes

- **Dev server:** `npm run dev` → `localhost:3000`
- **Build:** `npm run build` — all 12 routes compile clean
- **Test:** `npm test` — (not yet configured, see Test Debt above)
- **All pages use mock data** — no database or API calls yet
- **State is client-side only** (Zustand) — no persistence
- **Sidebar nav items map 1:1 to routes** — adding a page = add route + add nav item in `sidebar.tsx`
