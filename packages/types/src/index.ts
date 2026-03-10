/**
 * Core domain types for the Industrial Dashboard.
 * These are shared between frontend (apps/web) and backend (apps/api)
 * to ensure consistent data contracts throughout the system.
 */

// ─── Machine ────────────────────────────────────────────────────────────────

export type MachineState = "RUNNING" | "STOPPED" | "MAINTENANCE" | "ERROR";

export interface MachineMetrics {
  temperature: number; // °C
  rpm: number;
  uptime: number; // seconds
  efficiency: number; // 0–100 %
}

export interface OEE {
  overall: number; // OEE = availability × performance × quality (0–100 %)
  availability: number;
  performance: number;
  quality: number;
}

export interface MachineStatus {
  id: string;
  timestamp: Date;
  state: MachineState;
  metrics: MachineMetrics;
  oee: OEE;
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export type AlertLevel = "INFO" | "WARNING" | "CRITICAL";

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  component: string;
  timestamp: Date;
  acknowledged: boolean;
}

// ─── Metric History ──────────────────────────────────────────────────────────

export interface MetricHistory {
  timestamp: Date;
  temperature: number;
  rpm: number;
  efficiency: number;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

export interface StatusResponse {
  machine: MachineStatus;
  recentAlerts: Alert[];
  metricHistory: MetricHistory[];
}
