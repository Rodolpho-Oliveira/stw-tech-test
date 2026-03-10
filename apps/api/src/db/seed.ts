/**
 * Seed script: populates the SQLite database with realistic initial data.
 *
 * Simulates 2 hours of recent history for the "Misturador M-01" machine,
 * generating readings every 30 seconds (240 data points) plus a set of
 * plausible historical alerts.
 *
 * Run once: npm run seed  (from apps/api)
 */

import { v4 as uuidv4 } from "uuid";
import { initDb, db } from "./database";

initDb();

const MACHINE_ID = "misturador-m01";
const NOW = Date.now();
const INTERVAL_MS = 30_000; // 30 s between historical readings
const HISTORY_POINTS = 120; // 60 min of history

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Adds gaussian-like noise to a base value using the Box–Muller transform.
 * This produces more realistic sensor jitter than simple Math.random().
 */
function jitter(base: number, stdDev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return base + gauss * stdDev;
}

// ─── Metric simulation ───────────────────────────────────────────────────────

let temp = 72; // starting temperature (°C)
let rpm = 1200; // starting RPM

function nextTemp(): number {
  temp = clamp(jitter(temp, 1.5), 60, 95);
  return Math.round(temp * 10) / 10;
}

function nextRpm(): number {
  rpm = clamp(jitter(rpm, 15), 800, 1500);
  return Math.round(rpm);
}

function calcOEE(temp: number, rpm: number) {
  // Availability drops when temp is very high (forced slow-down)
  const availability = clamp(100 - Math.max(0, temp - 80) * 2, 85, 100);
  // Performance correlates with RPM vs nominal 1200 RPM
  const performance = clamp((rpm / 1200) * 100, 70, 100);
  const quality = clamp(jitter(94, 1), 88, 100);
  const overall = (availability * performance * quality) / 10_000;
  return {
    overall: Math.round(overall * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
  };
}

// ─── Seed machine_status (latest snapshot) ──────────────────────────────────

const latestTemp = nextTemp();
const latestRpm = nextRpm();
const latestOEE = calcOEE(latestTemp, latestRpm);

db.prepare(`
  INSERT OR REPLACE INTO machine_status
    (id, timestamp, state, temperature, rpm, uptime, efficiency,
     oee_overall, oee_availability, oee_performance, oee_quality)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  MACHINE_ID,
  new Date(NOW).toISOString(),
  "RUNNING",
  latestTemp,
  latestRpm,
  19380, // ~5h 23m in seconds
  latestOEE.overall,
  latestOEE.overall,
  latestOEE.availability,
  latestOEE.performance,
  latestOEE.quality
);

// ─── Seed metric_history ─────────────────────────────────────────────────────

const insertHistory = db.prepare(`
  INSERT INTO metric_history (timestamp, temperature, rpm, efficiency)
  VALUES (?, ?, ?, ?)
`);

// Clear previous history before re-seeding
db.prepare("DELETE FROM metric_history").run();

const seedHistory = db.transaction(() => {
  for (let i = HISTORY_POINTS; i >= 0; i--) {
    const ts = new Date(NOW - i * INTERVAL_MS).toISOString();
    const t = nextTemp();
    const r = nextRpm();
    const oee = calcOEE(t, r);
    insertHistory.run(ts, t, r, oee.overall);
  }
});
seedHistory();

// ─── Seed alerts ─────────────────────────────────────────────────────────────

db.prepare("DELETE FROM alerts").run();

const insertAlert = db.prepare(`
  INSERT INTO alerts (id, level, message, component, timestamp, acknowledged)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const seedAlerts = [
  {
    level: "CRITICAL",
    message: "Temperatura acima de 90°C – resfriamento ativado",
    component: "Sistema de Temperatura",
    minutesAgo: 2,
    acknowledged: 0,
  },
  {
    level: "WARNING",
    message: "RPM abaixo do limite operacional (< 900 RPM)",
    component: "Motor Principal",
    minutesAgo: 5,
    acknowledged: 0,
  },
  {
    level: "INFO",
    message: "Manutenção preventiva programada para 72h",
    component: "Sistema de Manutenção",
    minutesAgo: 15,
    acknowledged: 0,
  },
  {
    level: "WARNING",
    message: "Pressão hidráulica flutuando fora do intervalo normal",
    component: "Sistema Hidráulico",
    minutesAgo: 42,
    acknowledged: 1,
  },
  {
    level: "INFO",
    message: "Ciclo de lubrificação automática concluído",
    component: "Sistema de Lubrificação",
    minutesAgo: 60,
    acknowledged: 1,
  },
  {
    level: "CRITICAL",
    message: "Falha temporária no sensor de vibração – reconectado",
    component: "Sensor de Vibração",
    minutesAgo: 90,
    acknowledged: 1,
  },
  {
    level: "INFO",
    message: "Operador realizou troca de turno",
    component: "Controle de Acesso",
    minutesAgo: 120,
    acknowledged: 1,
  },
];

const seedAlertsTransaction = db.transaction(() => {
  for (const alert of seedAlerts) {
    insertAlert.run(
      uuidv4(),
      alert.level,
      alert.message,
      alert.component,
      new Date(NOW - alert.minutesAgo * 60_000).toISOString(),
      alert.acknowledged
    );
  }
});
seedAlertsTransaction();

console.log(
  `[Seed] machine_status populated with 1 current reading for "${MACHINE_ID}"`
);
console.log(`[Seed] metric_history populated with ${HISTORY_POINTS + 1} points`);
console.log(`[Seed] ${seedAlerts.length} alerts inserted`);
console.log("[Seed] Done.");
