/**
 * useMachineData: main data-fetching hook for the dashboard.
 *
 * Strategy:
 * 1. Fetch initial dashboard snapshot via REST on mount
 * 2. Open an SSE stream for real-time push updates (machine status + alerts)
 * 3. Merge SSE updates into local state; fetch full history separately
 *    (history is too large to send on every SSE tick)
 * 4. Track connection health: mark as "disconnected" if SSE errors
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MachineStatus, Alert, MetricHistory } from "@industrial/types";
import {
  fetchDashboard,
  fetchHistory,
  subscribeToEvents,
  acknowledgeAlert as apiAcknowledge,
  type SSEPayload,
} from "@/lib/api";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface MachineDataState {
  machine: MachineStatus | null;
  alerts: Alert[];
  history: MetricHistory[];
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
}

export function useMachineData() {
  const [state, setState] = useState<MachineDataState>({
    machine: null,
    alerts: [],
    history: [],
    connectionStatus: "connecting",
    lastUpdated: null,
  });

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupSSE = useRef<(() => void) | null>(null);

  // ─── History refresh ─────────────────────────────────────────────────────
  // History is updated every time the SSE fires but we don't include it in
  // the SSE payload (would be too large). Instead we re-fetch it every 15 s.
  const refreshHistory = useCallback(async () => {
    try {
      const history = await fetchHistory(60);
      setState((prev) => ({ ...prev, history }));
    } catch {
      // Non-fatal – keep old history
    }
  }, []);

  // ─── SSE subscription ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    setState((prev) => ({ ...prev, connectionStatus: "connecting" }));

    const cleanup = subscribeToEvents(
      (payload: SSEPayload) => {
        setState((prev) => ({
          ...prev,
          machine: payload.machine,
          alerts: payload.recentAlerts,
          connectionStatus: "connected",
          lastUpdated: new Date(),
        }));
      },
      (_err: Event) => {
        setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
        // Attempt reconnect after 5 s
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => connect(), 5_000);
      }
    );

    cleanupSSE.current = cleanup;
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let historyInterval: ReturnType<typeof setInterval>;

    (async () => {
      try {
        const dashboard = await fetchDashboard();
        setState({
          machine: dashboard.machine,
          alerts: dashboard.recentAlerts,
          history: dashboard.metricHistory,
          connectionStatus: "connecting",
          lastUpdated: new Date(),
        });
      } catch {
        setState((prev) => ({ ...prev, connectionStatus: "disconnected" }));
      }

      connect();
      historyInterval = setInterval(refreshHistory, 15_000);
    })();

    return () => {
      cleanupSSE.current?.();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      clearInterval(historyInterval);
    };
  }, [connect, refreshHistory]);

  // ─── Acknowledge alert ────────────────────────────────────────────────────
  const acknowledge = useCallback(async (id: string) => {
    await apiAcknowledge(id);
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      ),
    }));
  }, []);

  return { ...state, acknowledge };
}
