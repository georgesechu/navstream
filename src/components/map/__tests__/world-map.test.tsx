import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const safeProps = { ...props };
      delete safeProps.initial;
      delete safeProps.animate;
      delete safeProps.exit;
      delete safeProps.transition;
      delete safeProps.whileHover;
      delete safeProps.whileTap;
      return <div {...safeProps}>{children}</div>;
    },
    g: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const safeProps = { ...props };
      delete safeProps.initial;
      delete safeProps.animate;
      delete safeProps.exit;
      delete safeProps.transition;
      return <g {...safeProps}>{children}</g>;
    },
    foreignObject: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const safeProps = { ...props };
      delete safeProps.initial;
      delete safeProps.animate;
      delete safeProps.exit;
      delete safeProps.transition;
      return <foreignObject {...safeProps}>{children}</foreignObject>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  useMotionValue: () => ({
    get: () => 0,
    set: () => {},
    on: () => () => {},
  }),
  useTransform: () => ({
    get: () => "0 0 1000 500",
    on: (_event: string, callback: (v: string) => void) => {
      callback("0 0 1000 500");
      return () => {};
    },
  }),
  animate: vi.fn(),
}));

const mockSites = [
  {
    id: "site-1",
    name: "Kalgoorlie Gold Mine",
    lat: -30.749,
    lng: 121.466,
    status: "online" as const,
    type: "Mining",
    activeAlerts: 0,
  },
  {
    id: "site-2",
    name: "Broken Hill Processing",
    lat: -31.953,
    lng: 141.467,
    status: "critical" as const,
    type: "Processing",
    activeAlerts: 3,
  },
  {
    id: "site-3",
    name: "Pilbara Iron Works",
    lat: -22.305,
    lng: 118.567,
    status: "warning" as const,
    type: "Mining",
    activeAlerts: 1,
  },
];

import { WorldMap } from "../world-map";

describe("WorldMap", () => {
  it('renders with data-testid="world-map"', () => {
    render(<WorldMap sites={[]} />);
    expect(screen.getByTestId("world-map")).toBeInTheDocument();
  });

  it("renders markers for each site passed in", () => {
    render(<WorldMap sites={mockSites} />);
    expect(screen.getByTestId("world-map-marker-site-1")).toBeInTheDocument();
    expect(screen.getByTestId("world-map-marker-site-2")).toBeInTheDocument();
    expect(screen.getByTestId("world-map-marker-site-3")).toBeInTheDocument();
  });

  it("renders correct number of markers matching sites count", () => {
    render(<WorldMap sites={mockSites} />);
    const markers = mockSites.map((s) =>
      screen.getByTestId(`world-map-marker-${s.id}`)
    );
    expect(markers).toHaveLength(3);
  });

  it("renders no markers when sites array is empty", () => {
    render(<WorldMap sites={[]} />);
    expect(screen.queryByTestId(/world-map-marker-/)).not.toBeInTheDocument();
  });

  it("renders with a custom className", () => {
    render(<WorldMap sites={[]} className="custom-class" />);
    const map = screen.getByTestId("world-map");
    expect(map.className).toContain("custom-class");
  });
});
