import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("renders correct label text", () => {
    render(<StatusBadge status="critical" label="System Critical" />);
    expect(screen.getByText("System Critical")).toBeInTheDocument();
  });

  it("renders default label from status when no label prop", () => {
    render(<StatusBadge status="online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders default label for warning status", () => {
    render(<StatusBadge status="warning" />);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("applies correct data-testid", () => {
    render(<StatusBadge status="critical" data-testid="custom-badge" />);
    expect(screen.getByTestId("custom-badge")).toBeInTheDocument();
  });

  it("applies default data-testid from status", () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByTestId("status-badge-offline")).toBeInTheDocument();
  });

  it("shows pulse animation when pulse=true", () => {
    render(<StatusBadge status="online" pulse={true} />);
    const badge = screen.getByTestId("status-badge-online");
    // The dot element inside the badge should have the status-online class (pulse)
    const dot = badge.querySelector(".status-online");
    expect(dot).toBeInTheDocument();
  });

  it("does not show pulse animation when pulse=false", () => {
    render(<StatusBadge status="online" pulse={false} />);
    const badge = screen.getByTestId("status-badge-online");
    const dot = badge.querySelector(".status-online");
    expect(dot).not.toBeInTheDocument();
  });
});
