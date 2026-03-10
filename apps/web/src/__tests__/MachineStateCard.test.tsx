/**
 * Tests for MachineStateCard component.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MachineStateCard } from "@/components/dashboard/MachineStateCard";
import type { MachineState } from "@industrial/types";

describe("MachineStateCard", () => {
  it("renders skeleton when state is null", () => {
    const { container } = render(<MachineStateCard state={null} />);
    // Skeleton has animate-pulse class
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  const stateLabels: Array<[MachineState, string]> = [
    ["RUNNING", "Ligada"],
    ["STOPPED", "Desligada"],
    ["MAINTENANCE", "Manutenção"],
    ["ERROR", "Erro"],
  ];

  test.each(stateLabels)(
    "renders correct label for state %s",
    (state, expectedLabel) => {
      render(<MachineStateCard state={state} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );
});
