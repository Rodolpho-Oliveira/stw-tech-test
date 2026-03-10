/**
 * Tests for AlertsList component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertsList } from "@/components/alerts/AlertsList";
import type { Alert } from "@industrial/types";

// Stub AudioContext (not available in jsdom)
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
})) as unknown as typeof AudioContext;

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: "alert-1",
  level: "WARNING",
  message: "Teste de alerta",
  component: "Motor",
  timestamp: new Date("2024-01-01T10:00:00Z"),
  acknowledged: false,
  ...overrides,
});

describe("AlertsList", () => {
  it("shows empty state when no active alerts", () => {
    render(<AlertsList alerts={[]} onAcknowledge={jest.fn()} />);
    expect(screen.getByText("Nenhum alerta ativo")).toBeInTheDocument();
  });

  it("renders alert message", () => {
    const alerts = [makeAlert({ message: "RPM baixo detectado" })];
    render(<AlertsList alerts={alerts} onAcknowledge={jest.fn()} />);
    expect(screen.getByText("RPM baixo detectado")).toBeInTheDocument();
  });

  it("calls onAcknowledge with correct id when ack button clicked", () => {
    const onAck = jest.fn();
    const alerts = [makeAlert({ id: "test-id-123" })];
    render(<AlertsList alerts={alerts} onAcknowledge={onAck} />);
    // The acknowledge button has aria-label
    const btn = screen.getByLabelText("Reconhecer alerta");
    fireEvent.click(btn);
    expect(onAck).toHaveBeenCalledWith("test-id-123");
  });

  it("hides acknowledged alerts by default and shows toggle", () => {
    const alerts = [
      makeAlert({ id: "1", acknowledged: false, message: "Ativo" }),
      makeAlert({ id: "2", acknowledged: true, message: "Reconhecido" }),
    ];
    render(<AlertsList alerts={alerts} onAcknowledge={jest.fn()} />);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.queryByText("Reconhecido")).not.toBeInTheDocument();
    expect(screen.getByText("+1 reconhecidos")).toBeInTheDocument();
  });
});
