import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensorLineChart } from "../sensor-line-chart";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    path: (props: Record<string, unknown>) => {
      const { d, fill, stroke, strokeWidth } = props as {
        d?: string;
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
      };
      return <path d={d as string} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    },
    circle: (props: Record<string, unknown>) => {
      const { cx, cy, r, fill } = props as {
        cx?: number;
        cy?: number;
        r?: number;
        fill?: string;
      };
      return <circle cx={cx} cy={cy} r={r} fill={fill} />;
    },
  },
}));

function makeData(count: number): { timestamp: string; value: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(2026, 6, 15, i).toISOString(),
    value: 90 + i * 2,
  }));
}

describe("SensorLineChart", () => {
  it("renders with correct data-testid", () => {
    const data = makeData(5);
    const { container } = render(
      <SensorLineChart
        data={data}
        unit="°C"
        label="Temperature"
        sensorId="sensor-42"
      />
    );

    expect(screen.getByTestId("sensor-chart-sensor-42")).toBeInTheDocument();
  });

  it("renders threshold lines when thresholds provided", () => {
    const data = makeData(5);
    const { container } = render(
      <SensorLineChart
        data={data}
        unit="°C"
        label="Temperature"
        sensorId="sensor-42"
        thresholds={{ warningHigh: 95, criticalHigh: 100 }}
      />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Threshold lines have dashed stroke and specific colors
    const lines = svg!.querySelectorAll("line");
    const warningLine = Array.from(lines).find(
      (l) => l.getAttribute("stroke") === "#ffab00"
    );
    const criticalLine = Array.from(lines).find(
      (l) => l.getAttribute("stroke") === "#ff1744"
    );

    expect(warningLine).toBeTruthy();
    expect(criticalLine).toBeTruthy();
  });

  it("handles empty data array without crashing", () => {
    const { container } = render(
      <SensorLineChart data={[]} unit="°C" label="Temperature" />
    );

    // With < 2 data points, component returns null
    expect(container.innerHTML).toBe("");
  });

  it("handles single data point without crashing", () => {
    const { container } = render(
      <SensorLineChart
        data={[{ timestamp: "2026-07-15T00:00:00Z", value: 100 }]}
        unit="°C"
        label="Temperature"
      />
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders correct number of hover rects matching data points", () => {
    const data = makeData(8);
    const { container } = render(
      <SensorLineChart
        data={data}
        unit="°C"
        label="Temperature"
        sensorId="sensor-42"
      />
    );

    const svg = container.querySelector("svg");
    // Invisible hover rects — one per data point, with fill="transparent"
    const transparentRects = svg!.querySelectorAll('rect[fill="transparent"]');
    expect(transparentRects).toHaveLength(8);
  });
});
