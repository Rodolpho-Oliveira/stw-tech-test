/**
 * RealtimeSimulator: runs a background interval that mutates machine state
 * and writes new readings into SQLite every 3 seconds.
 *
 * Design decisions:
 * - Uses a Markov-like state machine so transitions are realistic
 *   (e.g., RUNNING → ERROR is possible; STOPPED → ERROR is not)
 * - Temperature and RPM use bounded random walks (Ornstein–Uhlenbeck style)
 *   for smoother, more realistic time-series
 * - Alert generation is threshold-based, with a short cooldown to avoid
 *   flooding the alert table
 */

import type { MachineStatus, MachineState } from "@industrial/types";
import {
  getCurrentStatus,
  updateMachineStatus,
  appendMetricHistory,
  addAlert,
} from "./machineService";

const MACHINE_ID = "misturador-m01";
const TICK_MS = 3_000; // 3 seconds

// ─── State transition probabilities ──────────────────────────────────────────
// Each state maps to [ nextState, probability ] pairs (must sum to 1)
const TRANSITIONS: Record<MachineState, Array<[MachineState, number]>> = {
  RUNNING: [
    ["RUNNING", 0.94],
    ["MAINTENANCE", 0.03],
    ["ERROR", 0.02],
    ["STOPPED", 0.01],
  ],
  STOPPED: [
    ["STOPPED", 0.7],
    ["RUNNING", 0.25],
    ["MAINTENANCE", 0.05],
  ],
  MAINTENANCE: [
    ["MAINTENANCE", 0.6],
    ["RUNNING", 0.35],
    ["STOPPED", 0.05],
  ],
  ERROR: [
    ["ERROR", 0.4],
    ["STOPPED", 0.4],
    ["MAINTENANCE", 0.2],
  ],
};

function pickNextState(current: MachineState): MachineState {
  const rand = Math.random();
  let cumulative = 0;
  for (const [state, prob] of TRANSITIONS[current]) {
    cumulative += prob;
    if (rand < cumulative) return state;
  }
  return current;
}

// ─── Metric simulation ────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Ornstein–Uhlenbeck step: pulls the value toward a mean with some noise.
 * theta = mean-reversion speed, sigma = volatility
 */
function ouStep(value: number, mean: number, theta = 0.1, sigma = 2): number {
  return value + theta * (mean - value) + sigma * (Math.random() * 2 - 1);
}

const NOM_TEMP = 75; // nominal operating temperature
const NOM_RPM = 1200; // nominal RPM

// Alert cooldown tracking (prevents duplicate alerts in short windows)
const lastAlertAt: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 60_000; // 1 minute cooldown per component-level pair

function maybeAlert(
  now: number,
  component: string,
  level: "INFO" | "WARNING" | "CRITICAL",
  message: string
) {
  const key = `${component}:${level}`;
  if (!lastAlertAt[key] || now - lastAlertAt[key] > ALERT_COOLDOWN_MS) {
    addAlert(level, message, component);
    lastAlertAt[key] = now;
  }
}

// ─── Main tick ────────────────────────────────────────────────────────────────

function tick() {
  const current = getCurrentStatus();
  if (!current) return;

  const now = Date.now();
  const nextState = pickNextState(current.state);

  // Simulate metric changes
  let temp = ouStep(current.metrics.temperature, NOM_TEMP, 0.08, 1.5);
  let rpm = ouStep(current.metrics.rpm, NOM_RPM, 0.08, 25);

  // State-specific adjustments
  if (nextState === "STOPPED" || nextState === "MAINTENANCE") {
    rpm = clamp(ouStep(rpm, 0, 0.3, 10), 0, 200);
    temp = clamp(ouStep(temp, 40, 0.1, 1), 30, 60);
  } else if (nextState === "ERROR") {
    // Temperature spikes during errors
    temp = clamp(temp + 3 + Math.random() * 4, 60, 98);
    rpm = clamp(ouStep(rpm, 500, 0.3, 30), 0, 900);
  } else {
    temp = clamp(temp, 55, 95);
    rpm = clamp(rpm, 800, 1500);
  }

  temp = Math.round(temp * 10) / 10;
  rpm = Math.round(rpm);

  // OEE calculation (same logic as seed.ts)
  const availability = clamp(100 - Math.max(0, temp - 80) * 2, 75, 100);
  const performance = clamp((rpm / NOM_RPM) * 100, 60, 100);
  const quality = clamp(
    current.oee.quality + (Math.random() - 0.5) * 0.5,
    85,
    100
  );
  const overall = Math.round(((availability * performance * quality) / 10_000) * 10) / 10;

  const uptime =
    nextState === "RUNNING"
      ? current.metrics.uptime + TICK_MS / 1000
      : current.metrics.uptime;

  const updated: MachineStatus = {
    id: MACHINE_ID,
    timestamp: new Date(now),
    state: nextState,
    metrics: {
      temperature: temp,
      rpm,
      uptime,
      efficiency: overall,
    },
    oee: {
      overall,
      availability: Math.round(availability * 10) / 10,
      performance: Math.round(performance * 10) / 10,
      quality: Math.round(quality * 10) / 10,
    },
  };

  updateMachineStatus(updated);
  appendMetricHistory({
    timestamp: new Date(now),
    temperature: temp,
    rpm,
    efficiency: overall,
  });

  // ─── Threshold-based alerts ──────────────────────────────────────────────
  if (temp > 88) {
    maybeAlert(now, "Sistema de Temperatura", "CRITICAL",
      `Temperatura crítica: ${temp}°C – acima do limite de 88°C`);
  } else if (temp > 82) {
    maybeAlert(now, "Sistema de Temperatura", "WARNING",
      `Temperatura elevada: ${temp}°C – monitoramento intensificado`);
  }

  if (rpm < 900 && nextState === "RUNNING") {
    maybeAlert(now, "Motor Principal", "WARNING",
      `RPM abaixo do mínimo operacional: ${rpm} RPM`);
  }

  if (nextState === "ERROR" && current.state !== "ERROR") {
    maybeAlert(now, "Sistema de Controle", "CRITICAL",
      "Máquina entrou em estado de ERRO – intervenção necessária");
  }

  if (overall < 80 && nextState === "RUNNING") {
    maybeAlert(now, "OEE", "WARNING",
      `OEE abaixo de 80%: ${overall}% – verificar eficiência`);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startSimulator() {
  if (intervalHandle) return;
  intervalHandle = setInterval(tick, TICK_MS);
  console.log(`[Simulator] Started – ticking every ${TICK_MS / 1000}s`);
}

export function stopSimulator() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[Simulator] Stopped");
  }
}
