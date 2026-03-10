/**
 * Tests for MetricCard component.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "@/components/dashboard/MetricCard";

describe("MetricCard", () => {
  it("renders title and value", () => {
    render(<MetricCard title="Temperatura" value={78.2} unit="°C" />);
    expect(screen.getByText("Temperatura")).toBeInTheDocument();
    expect(screen.getByText("78.2")).toBeInTheDocument();
    expect(screen.getByText("°C")).toBeInTheDocument();
  });

  it("renders maxLabel when provided", () => {
    render(
      <MetricCard title="RPM" value={1200} maxLabel="Máx: 1500" />
    );
    expect(screen.getByText("Máx: 1500")).toBeInTheDocument();
  });

  it("shows up-arrow for upward trend", () => {
    render(
      <MetricCard title="RPM" value={1300} trendDirection="up" upIsGood />
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("shows down-arrow for downward trend", () => {
    render(
      <MetricCard title="Temp" value={65} trendDirection="down" upIsGood={false} />
    );
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("does not render arrow for neutral trend", () => {
    render(<MetricCard title="OEE" value={92} trendDirection="neutral" />);
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });
});
