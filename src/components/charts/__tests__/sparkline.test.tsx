import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "../sparkline";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    svg: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { width, height, viewBox } = props as {
        width?: number;
        height?: number;
        viewBox?: string;
      };
      return (
        <svg width={width} height={height} viewBox={viewBox}>
          {children}
        </svg>
      );
    },
    path: (props: Record<string, unknown>) => {
      const { d, fill, stroke } = props as {
        d?: string;
        fill?: string;
        stroke?: string;
      };
      return <path d={d as string} fill={fill} stroke={stroke} />;
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

describe("Sparkline", () => {
  it("renders SVG element", () => {
    const { container } = render(
      <Sparkline data={[10, 20, 30, 40, 50]} width={160} height={40} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "160");
    expect(svg).toHaveAttribute("height", "40");
  });

  it("returns null for fewer than 2 data points", () => {
    const { container: empty } = render(<Sparkline data={[]} />);
    expect(empty.innerHTML).toBe("");

    const { container: single } = render(<Sparkline data={[42]} />);
    expect(single.innerHTML).toBe("");
  });

  it("renders path element for line", () => {
    const { container } = render(
      <Sparkline data={[10, 20, 30]} width={100} height={30} />
    );

    const paths = container.querySelectorAll("path");
    // Should have at least 2 paths: area fill + line
    expect(paths.length).toBeGreaterThanOrEqual(2);

    // The line path should have a stroke color
    const linePath = Array.from(paths).find(
      (p) => p.getAttribute("stroke") !== null
    );
    expect(linePath).toBeTruthy();
  });

  it("renders with exactly 2 data points", () => {
    const { container } = render(<Sparkline data={[5, 15]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
