/**
 * API entry point.
 *
 * Start order:
 * 1. Initialize SQLite schema
 * 2. Seed database if empty (first run)
 * 3. Register routes
 * 4. Start Express server
 * 5. Start background simulator
 */

import express from "express";
import cors from "cors";
import { initDb, db } from "./db/database";
import { machineRouter } from "./routes/machine";
import { requestLogger } from "./middleware/logger";
import { startSimulator } from "./services/simulator";

const PORT = process.env.PORT || 3001;

// ─── DB ──────────────────────────────────────────────────────────────────────

initDb();

// Auto-seed on first run (no rows in machine_status)
const hasData = db
  .prepare("SELECT COUNT(*) as count FROM machine_status")
  .get() as { count: number };

if (hasData.count === 0) {
  console.log("[Server] Database is empty – running seed...");
  // Dynamic require to avoid bundling issues
  require("./db/seed");
}

// ─── Express ─────────────────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/machine", machineRouter);

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  startSimulator();
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received – shutting down");
  server.close(() => process.exit(0));
});

export default app;
