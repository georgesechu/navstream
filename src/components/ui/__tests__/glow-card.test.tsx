import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlowCard } from "../glow-card";

// Mock framer-motion
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
          key === "role"
        ) {
          safeProps[key] = value;
        }
      }
      return <div {...safeProps}>{children}</div>;
    },
  },
}));

describe("GlowCard", () => {
  it("renders children", () => {
    render(
      <GlowCard>
        <p>Card content</p>
      </GlowCard>
    );

    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies custom data-testid", () => {
    render(
      <GlowCard data-testid="my-card">
        <span>Hello</span>
      </GlowCard>
    );

    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <GlowCard className="custom-class" data-testid="styled-card">
        <span>Styled</span>
      </GlowCard>
    );

    const card = screen.getByTestId("styled-card");
    expect(card).toHaveClass("custom-class");
  });

  it("renders without data-testid when not provided", () => {
    const { container } = render(
      <GlowCard>
        <span>No testid</span>
      </GlowCard>
    );

    expect(screen.getByText("No testid")).toBeInTheDocument();
    // The outer div should not have a data-testid attribute
    const outerDiv = container.firstElementChild;
    expect(outerDiv).not.toHaveAttribute("data-testid");
  });
});
