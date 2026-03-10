/**
 * Machine routes:
 *   GET  /api/machine/status          – current snapshot
 *   GET  /api/machine/history         – metric history for charts
 *   GET  /api/machine/alerts          – recent alerts list
 *   POST /api/machine/alerts/:id/ack  – acknowledge an alert
 *   GET  /api/machine/dashboard       – single call that returns all of the above
 *   GET  /api/machine/events          – SSE stream for real-time push
 */

import { Router, Request, Response } from "express";
import {
  getCurrentStatus,
  getMetricHistory,
  getAlerts,
  acknowledgeAlert,
} from "../services/machineService";

export const machineRouter = Router();

// ─── Current status ──────────────────────────────────────────────────────────

machineRouter.get("/status", (_req: Request, res: Response) => {
  const status = getCurrentStatus();
  if (!status) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }
  res.json({ data: status, timestamp: new Date().toISOString() });
});

// ─── Metric history ──────────────────────────────────────────────────────────

machineRouter.get("/history", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 60, 120);
  const history = getMetricHistory(limit);
  res.json({ data: history, timestamp: new Date().toISOString() });
});

// ─── Alerts ──────────────────────────────────────────────────────────────────

machineRouter.get("/alerts", (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const alerts = getAlerts(limit);
  res.json({ data: alerts, timestamp: new Date().toISOString() });
});

machineRouter.post("/alerts/:id/ack", (req: Request, res: Response) => {
  const success = acknowledgeAlert(String(req.params.id));
  if (!success) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json({ success: true });
});

// ─── Dashboard (composite endpoint) ──────────────────────────────────────────

machineRouter.get("/dashboard", (_req: Request, res: Response) => {
  const status = getCurrentStatus();
  if (!status) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }

  res.json({
    data: {
      machine: status,
      recentAlerts: getAlerts(10),
      metricHistory: getMetricHistory(60),
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── SSE – Real-time event stream ────────────────────────────────────────────
// The frontend subscribes to this endpoint and receives a push every 3 seconds
// without polling. Using SSE (instead of WebSocket) keeps the server stateless
// and integrates cleanly with Express.

machineRouter.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = () => {
    const status = getCurrentStatus();
    const alerts = getAlerts(10);
    if (status) {
      const payload = JSON.stringify({ machine: status, recentAlerts: alerts });
      res.write(`data: ${payload}\n\n`);
    }
  };

  // Send immediately on connect, then every 3 s
  send();
  const interval = setInterval(send, 3_000);

  req.on("close", () => {
    clearInterval(interval);
  });
});
