import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { POIDetailPanel } from "../poi-detail-panel";
import {
  createMockEquipment,
  createMockSensor,
  createMockAlert,
  createMockWorkOrder,
  createMockSensorReadings,
  resetIdCounter,
} from "@/test/factories";

// Mock framer-motion to render plain elements
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const safeProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (
          key.startsWith("data-") ||
          key === "className" ||
          key === "style" ||
          key === "id" ||
          key === "role" ||
          key === "onClick"
        ) {
          safeProps[key] = value;
        }
      }
      return <div {...safeProps}>{children}</div>;
    },
    path: (props: Record<string, unknown>) => <path />,
    circle: (props: Record<string, unknown>) => <circle />,
    svg: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { width, height, viewBox } = props as { width?: number; height?: number; viewBox?: string };
      return <svg width={width} height={height} viewBox={viewBox}>{children}</svg>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function buildEquipmentResponse(overrides?: Record<string, unknown>) {
  const equipment = createMockEquipment({
    name: "Primary Coolant Pump",
    status: "operational",
    category: "pump",
    maintenanceHistory: [
      {
        date: "2026-06-01T00:00:00Z",
        type: "scheduled",
        description: "Replaced bearing seals",
        technician: "David Okonkwo",
        durationMinutes: 90,
        partsReplaced: ["Bearing seal kit"],
      },
    ],
  });

  const sensor = createMockSensor({
    name: "Bearing Temp",
    unit: "°C",
    currentValue: 95,
  });

  const readings = createMockSensorReadings(5, {
    sensorId: sensor.id as string,
    baseValue: 95,
    noise: 0,
  });

  const alert = createMockAlert({
    severity: "warning",
    status: "active",
    title: "Temperature rising",
  });

  const workOrder = createMockWorkOrder();

  return {
    ...equipment,
    sensors: [{ ...sensor, readings }],
    alerts: [alert],
    workOrders: [workOrder],
    ...overrides,
  };
}

describe("POIDetailPanel", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    resetIdCounter();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const basePOI = {
    id: "poi-1",
    label: "Pump Station",
    type: "equipment",
    status: "online" as const,
    equipmentId: "equip-123",
  };

  it("renders equipment name and status when data loads", async () => {
    const mockData = buildEquipmentResponse();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<POIDetailPanel poi={basePOI} siteId="site-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Primary Coolant Pump")).toBeInTheDocument();
    });

    // Status badge should be rendered
    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    // Make fetch hang indefinitely
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<POIDetailPanel poi={basePOI} siteId="site-1" onClose={vi.fn()} />);

    // Should show the panel with skeleton blocks (animate-pulse divs)
    const panel = screen.getByTestId("poi-detail-panel");
    expect(panel).toBeInTheDocument();

    // The skeleton has animate-pulse class blocks
    const skeletons = panel.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders sensor values with correct units", async () => {
    const mockData = buildEquipmentResponse();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<POIDetailPanel poi={basePOI} siteId="site-1" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Bearing Temp")).toBeInTheDocument();
    });

    // Should show sensor value with unit
    expect(screen.getByText("95°C")).toBeInTheDocument();
  });

  it('shows "no equipment" message when equipmentId is null', () => {
    const poiWithoutEquipment = {
      id: "poi-2",
      label: "Camera Zone A",
      type: "camera",
      status: "online" as const,
    };

    // fetch should not be called
    globalThis.fetch = vi.fn();

    render(
      <POIDetailPanel poi={poiWithoutEquipment} siteId="site-1" onClose={vi.fn()} />
    );

    expect(
      screen.getByText(/not linked to any equipment/i)
    ).toBeInTheDocument();
    // The label appears in both header and SimplePOIInfo
    expect(screen.getAllByText("Camera Zone A").length).toBeGreaterThanOrEqual(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("close button calls onClose", async () => {
    const onClose = vi.fn();
    const poiWithoutEquipment = {
      id: "poi-3",
      label: "Test POI",
      type: "camera",
      status: "online" as const,
    };

    render(
      <POIDetailPanel poi={poiWithoutEquipment} siteId="site-1" onClose={onClose} />
    );

    const closeBtn = screen.getByTestId("poi-detail-panel-close");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("action links contain correct hrefs with equipment/site context", async () => {
    const mockData = buildEquipmentResponse();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <POIDetailPanel poi={basePOI} siteId="site-1" onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Primary Coolant Pump")).toBeInTheDocument();
    });

    // Check action links have proper context params
    const thermalLink = screen.getByText("View Thermal").closest("a");
    expect(thermalLink).toHaveAttribute(
      "href",
      expect.stringContaining("/imaging")
    );
    expect(thermalLink).toHaveAttribute(
      "href",
      expect.stringContaining("equipment=equip-123")
    );
    expect(thermalLink).toHaveAttribute(
      "href",
      expect.stringContaining("site=site-1")
    );

    const callLink = screen.getByText("Start Call").closest("a");
    expect(callLink).toHaveAttribute(
      "href",
      expect.stringContaining("/comms")
    );

    const workOrderLink = screen.getByText("Create Work Order").closest("a");
    expect(workOrderLink).toHaveAttribute(
      "href",
      expect.stringContaining("/ai")
    );
  });
});
