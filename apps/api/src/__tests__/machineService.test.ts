/**
 * Tests for the machine service layer (unit tests with in-memory SQLite).
 *
 * We initialise a fresh in-memory database for each test to ensure isolation.
 * This avoids file system I/O and makes tests fast and deterministic.
 */

// Override DB_PATH to use in-memory before importing the module
process.env.DB_OVERRIDE = ":memory:";

// We need to re-implement database.ts with an in-memory DB for tests.
// The simplest approach: use better-sqlite3 directly in the test.

import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { MachineStatus, Alert } from "@industrial/types";

// ─── Inline minimal service functions mirroring machineService.ts ────────────
// We test the logic independently from the file-system DB.

function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE machine_status (
      id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, state TEXT NOT NULL,
      temperature REAL, rpm REAL, uptime INTEGER, efficiency REAL,
      oee_overall REAL, oee_availability REAL, oee_performance REAL, oee_quality REAL
    );
    CREATE TABLE alerts (
      id TEXT PRIMARY KEY, level TEXT NOT NULL, message TEXT NOT NULL,
      component TEXT NOT NULL, timestamp TEXT NOT NULL, acknowledged INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE metric_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
      temperature REAL, rpm REAL, efficiency REAL
    );
  `);
  return db;
}

function insertStatus(db: Database.Database, status: MachineStatus) {
  db.prepare(`
    INSERT OR REPLACE INTO machine_status
      (id, timestamp, state, temperature, rpm, uptime, efficiency,
       oee_overall, oee_availability, oee_performance, oee_quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    status.id, status.timestamp.toISOString(), status.state,
    status.metrics.temperature, status.metrics.rpm, status.metrics.uptime,
    status.metrics.efficiency, status.oee.overall, status.oee.availability,
    status.oee.performance, status.oee.quality
  );
}

function insertAlert(
  db: Database.Database,
  level: "INFO" | "WARNING" | "CRITICAL",
  message: string,
  component: string
): Alert {
  const alert: Alert = {
    id: uuidv4(), level, message, component,
    timestamp: new Date(), acknowledged: false,
  };
  db.prepare(`
    INSERT INTO alerts (id, level, message, component, timestamp, acknowledged)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(alert.id, alert.level, alert.message, alert.component, alert.timestamp.toISOString());
  return alert;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Machine service – data layer", () => {
  let db: Database.Database;

  const sampleStatus: MachineStatus = {
    id: "machine-test",
    timestamp: new Date(),
    state: "RUNNING",
    metrics: { temperature: 75, rpm: 1200, uptime: 3600, efficiency: 92 },
    oee: { overall: 92, availability: 98, performance: 95, quality: 94 },
  };

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("inserts and retrieves machine status", () => {
    insertStatus(db, sampleStatus);
    const row = db
      .prepare("SELECT * FROM machine_status WHERE id = ?")
      .get(sampleStatus.id) as Record<string, unknown>;

    expect(row).toBeDefined();
    expect(row.state).toBe("RUNNING");
    expect(row.temperature).toBe(75);
    expect(row.rpm).toBe(1200);
  });

  it("updates existing machine status on re-insert", () => {
    insertStatus(db, sampleStatus);
    insertStatus(db, { ...sampleStatus, state: "MAINTENANCE", metrics: { ...sampleStatus.metrics, temperature: 55 } });

    const row = db
      .prepare("SELECT * FROM machine_status WHERE id = ?")
      .get(sampleStatus.id) as Record<string, unknown>;
    expect(row.state).toBe("MAINTENANCE");
    expect(row.temperature).toBe(55);
    // Only one row should exist
    const count = (db.prepare("SELECT COUNT(*) as c FROM machine_status").get() as { c: number }).c;
    expect(count).toBe(1);
  });

  it("inserts alerts with correct level", () => {
    insertAlert(db, "CRITICAL", "Temperatura crítica", "Sensor Temp.");
    insertAlert(db, "WARNING", "RPM baixo", "Motor");

    const rows = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC").all() as Array<{ level: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.level)).toContain("CRITICAL");
    expect(rows.map((r) => r.level)).toContain("WARNING");
  });

  it("acknowledges an alert", () => {
    const alert = insertAlert(db, "WARNING", "Aviso teste", "Componente X");
    expect(alert.acknowledged).toBe(false);

    db.prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?").run(alert.id);
    const row = db
      .prepare("SELECT acknowledged FROM alerts WHERE id = ?")
      .get(alert.id) as { acknowledged: number };
    expect(row.acknowledged).toBe(1);
  });

  it("stores metric history entries", () => {
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO metric_history (timestamp, temperature, rpm, efficiency)
        VALUES (?, ?, ?, ?)
      `).run(new Date(Date.now() + i * 1000).toISOString(), 70 + i, 1200 + i * 10, 90 + i);
    }

    const rows = db.prepare("SELECT COUNT(*) as c FROM metric_history").get() as { c: number };
    expect(rows.c).toBe(5);
  });
});
