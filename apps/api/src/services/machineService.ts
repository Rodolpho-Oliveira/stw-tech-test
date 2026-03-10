/**
 * MachineService: reads and updates machine state in SQLite.
 *
 * All mutations come through this service so the simulation logic
 * (simulator.ts) has a single place to write into the DB.
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "../db/database";
import type {
  MachineStatus,
  Alert,
  MetricHistory,
  MachineState,
  AlertLevel,
} from "@industrial/types";

const MACHINE_ID = "misturador-m01";

// ─── Read helpers ────────────────────────────────────────────────────────────

function rowToMachineStatus(row: Record<string, unknown>): MachineStatus {
  return {
    id: row.id as string,
    timestamp: new Date(row.timestamp as string),
    state: row.state as MachineState,
    metrics: {
      temperature: row.temperature as number,
      rpm: row.rpm as number,
      uptime: row.uptime as number,
      efficiency: row.efficiency as number,
    },
    oee: {
      overall: row.oee_overall as number,
      availability: row.oee_availability as number,
      performance: row.oee_performance as number,
      quality: row.oee_quality as number,
    },
  };
}

function rowToAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    level: row.level as AlertLevel,
    message: row.message as string,
    component: row.component as string,
    timestamp: new Date(row.timestamp as string),
    acknowledged: Boolean(row.acknowledged),
  };
}

function rowToMetricHistory(row: Record<string, unknown>): MetricHistory {
  return {
    timestamp: new Date(row.timestamp as string),
    temperature: row.temperature as number,
    rpm: row.rpm as number,
    efficiency: row.efficiency as number,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getCurrentStatus(): MachineStatus | null {
  const row = db
    .prepare("SELECT * FROM machine_status WHERE id = ?")
    .get(MACHINE_ID) as Record<string, unknown> | undefined;

  return row ? rowToMachineStatus(row) : null;
}

export function updateMachineStatus(status: MachineStatus): void {
  db.prepare(`
    INSERT OR REPLACE INTO machine_status
      (id, timestamp, state, temperature, rpm, uptime, efficiency,
       oee_overall, oee_availability, oee_performance, oee_quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    status.id,
    status.timestamp.toISOString(),
    status.state,
    status.metrics.temperature,
    status.metrics.rpm,
    status.metrics.uptime,
    status.metrics.efficiency,
    status.oee.overall,
    status.oee.availability,
    status.oee.performance,
    status.oee.quality
  );
}

export function appendMetricHistory(entry: MetricHistory): void {
  db.prepare(`
    INSERT INTO metric_history (timestamp, temperature, rpm, efficiency)
    VALUES (?, ?, ?, ?)
  `).run(
    entry.timestamp.toISOString(),
    entry.temperature,
    entry.rpm,
    entry.efficiency
  );

  // Keep only the last 120 records to avoid unbounded growth
  db.prepare(`
    DELETE FROM metric_history
    WHERE id NOT IN (
      SELECT id FROM metric_history ORDER BY timestamp DESC LIMIT 120
    )
  `).run();
}

export function getMetricHistory(limit = 60): MetricHistory[] {
  const rows = db
    .prepare(
      "SELECT * FROM metric_history ORDER BY timestamp DESC LIMIT ?"
    )
    .all(limit) as Record<string, unknown>[];

  // Return chronological order for charts
  return rows.map(rowToMetricHistory).reverse();
}

export function getAlerts(limit = 20): Alert[] {
  const rows = db
    .prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];

  return rows.map(rowToAlert);
}

export function addAlert(
  level: AlertLevel,
  message: string,
  component: string
): Alert {
  const alert: Alert = {
    id: uuidv4(),
    level,
    message,
    component,
    timestamp: new Date(),
    acknowledged: false,
  };

  db.prepare(`
    INSERT INTO alerts (id, level, message, component, timestamp, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    alert.id,
    alert.level,
    alert.message,
    alert.component,
    alert.timestamp.toISOString(),
    0
  );

  return alert;
}

export function acknowledgeAlert(id: string): boolean {
  const result = db
    .prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?")
    .run(id);

  return result.changes > 0;
}
