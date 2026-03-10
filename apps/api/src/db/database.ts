/**
 * Database initialization and schema definition.
 * Uses better-sqlite3 (synchronous SQLite) for simplicity and reliability.
 *
 * Schema rationale:
 * - machine_status: snapshot table – each row is a point-in-time reading
 * - alerts: event log; acknowledged flag allows UI to "dismiss" without deleting
 * - metric_history: downsampled series kept for historical chart rendering
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DB_DIR, "industrial.db");

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    -- Current machine status (single machine for this challenge – "misturador")
    CREATE TABLE IF NOT EXISTS machine_status (
      id          TEXT PRIMARY KEY,
      timestamp   TEXT NOT NULL,
      state       TEXT NOT NULL CHECK(state IN ('RUNNING','STOPPED','MAINTENANCE','ERROR')),
      temperature REAL NOT NULL,
      rpm         REAL NOT NULL,
      uptime      INTEGER NOT NULL,  -- seconds
      efficiency  REAL NOT NULL,     -- 0-100
      oee_overall       REAL NOT NULL,
      oee_availability  REAL NOT NULL,
      oee_performance   REAL NOT NULL,
      oee_quality       REAL NOT NULL
    );

    -- Alerts / events log
    CREATE TABLE IF NOT EXISTS alerts (
      id           TEXT PRIMARY KEY,
      level        TEXT NOT NULL CHECK(level IN ('INFO','WARNING','CRITICAL')),
      message      TEXT NOT NULL,
      component    TEXT NOT NULL,
      timestamp    TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0
    );

    -- Downsampled metric history for charts (last 60 readings)
    CREATE TABLE IF NOT EXISTS metric_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp   TEXT NOT NULL,
      temperature REAL NOT NULL,
      rpm         REAL NOT NULL,
      efficiency  REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp    ON alerts(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_history_timestamp   ON metric_history(timestamp DESC);
  `);

  console.log("[DB] Schema initialized at", DB_PATH);
}
