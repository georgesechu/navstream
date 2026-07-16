import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock framer-motion to avoid animation issues in tests
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
      // Remove motion-specific props that aren't valid DOM attributes
      delete safeProps.initial;
      delete safeProps.animate;
      delete safeProps.exit;
      delete safeProps.transition;
      delete safeProps.whileHover;
      delete safeProps.whileTap;
      return <div {...safeProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => ({ get: () => 0 }),
  animate: vi.fn(),
}));

// Mock the WorldMap component since it has complex SVG rendering
vi.mock("../world-map", () => ({
  WorldMap: ({
    className,
  }: {
    className?: string;
    sites?: unknown[];
    onSiteClick?: (id: string) => void;
  }) => <div data-testid="world-map-mock" className={className} />,
}));

const mockSites = [
  {
    id: "site-1",
    name: "Kalgoorlie Gold Mine",
    lat: -30.749,
    lng: 121.466,
    status: "online" as const,
    type: "Mining",
    personnelCount: 12,
    activeAlerts: 0,
    uptime: 99.5,
  },
  {
    id: "site-2",
    name: "Broken Hill Processing",
    lat: -31.953,
    lng: 141.467,
    status: "critical" as const,
    type: "Processing",
    personnelCount: 8,
    activeAlerts: 3,
    uptime: 94.2,
  },
  {
    id: "site-3",
    name: "Pilbara Iron Works",
    lat: -22.305,
    lng: 118.567,
    status: "warning" as const,
    type: "Mining",
    personnelCount: 15,
    activeAlerts: 1,
    uptime: 97.8,
  },
];

// Mock useSites hook
const mockUseSites = vi.fn();
vi.mock("@/hooks/use-sites", () => ({
  useSites: () => mockUseSites(),
}));

import { CommandMap } from "../command-map";

describe("CommandMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSites.mockReturnValue({
      sites: mockSites,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFromApi: true,
    });
  });

  it('renders with data-testid="command-map"', () => {
    render(<CommandMap />);
    expect(screen.getByTestId("command-map")).toBeInTheDocument();
  });

  it("shows stats bar with correct site count", () => {
    render(<CommandMap />);
    const totalSitesStat = screen.getByTestId("command-map-stats-total-sites");
    expect(totalSitesStat).toBeInTheDocument();
    expect(totalSitesStat).toHaveTextContent("3");
  });

  it("renders site cards with correct data-testid", () => {
    render(<CommandMap />);
    expect(screen.getByTestId("site-card-site-1")).toBeInTheDocument();
    expect(screen.getByTestId("site-card-site-2")).toBeInTheDocument();
    expect(screen.getByTestId("site-card-site-3")).toBeInTheDocument();
  });

  it("displays site names in cards", () => {
    render(<CommandMap />);
    expect(screen.getByText("Kalgoorlie Gold Mine")).toBeInTheDocument();
    expect(screen.getByText("Broken Hill Processing")).toBeInTheDocument();
    expect(screen.getByText("Pilbara Iron Works")).toBeInTheDocument();
  });

  it("shows loading state when isLoading is true", () => {
    mockUseSites.mockReturnValue({
      sites: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isFromApi: false,
    });
    render(<CommandMap />);
    expect(screen.getByTestId("command-map")).toBeInTheDocument();
    expect(screen.getByText("Loading sites...")).toBeInTheDocument();
  });

  it("shows correct stats for online/warning/critical counts", () => {
    render(<CommandMap />);
    // 1 online site
    expect(screen.getByTestId("command-map-stats-online")).toHaveTextContent("1");
    // 1 warning
    expect(screen.getByTestId("command-map-stats-warnings")).toHaveTextContent("1");
    // 1 critical
    expect(screen.getByTestId("command-map-stats-critical")).toHaveTextContent("1");
  });

  it("shows facilities count header", () => {
    render(<CommandMap />);
    expect(screen.getByText("Facilities (3)")).toBeInTheDocument();
  });

  it("renders map viewport", () => {
    render(<CommandMap />);
    expect(screen.getByTestId("command-map-viewport")).toBeInTheDocument();
  });
});
