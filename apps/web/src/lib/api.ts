/**
 * API client helpers.
 *
 * All calls are made to the Express backend running on port 3001.
 * If the env variable NEXT_PUBLIC_API_URL is set (e.g. in production)
 * it overrides the default localhost URL.
 */

import type {
  MachineStatus,
  Alert,
  MetricHistory,
  StatusResponse,
} from "@industrial/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Generic fetcher ──────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

// ─── Typed endpoints ──────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<StatusResponse> {
  return get<StatusResponse>("/api/machine/dashboard");
}

export async function fetchStatus(): Promise<MachineStatus> {
  return get<MachineStatus>("/api/machine/status");
}

export async function fetchHistory(limit = 60): Promise<MetricHistory[]> {
  return get<MetricHistory[]>(`/api/machine/history?limit=${limit}`);
}

export async function fetchAlerts(limit = 20): Promise<Alert[]> {
  return get<Alert[]>(`/api/machine/alerts?limit=${limit}`);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await fetch(`${BASE_URL}/api/machine/alerts/${id}/ack`, {
    method: "POST",
  });
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

export interface SSEPayload {
  machine: MachineStatus;
  recentAlerts: Alert[];
}

/**
 * Opens an SSE connection to /api/machine/events.
 * Returns a cleanup function that closes the EventSource.
 *
 * Design note: we use SSE rather than polling so that the component
 * doesn't need to manage its own setInterval – the server drives
 * the update cadence (every 3 s).
 */
export function subscribeToEvents(
  onMessage: (payload: SSEPayload) => void,
  onError: (error: Event) => void
): () => void {
  const es = new EventSource(`${BASE_URL}/api/machine/events`);

  es.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data) as {
        machine: MachineStatus & { timestamp: string };
        recentAlerts: Array<Alert & { timestamp: string }>;
      };

      // Parse ISO strings back to Date objects (JSON serialisation drops Date type)
      const payload: SSEPayload = {
        machine: {
          ...raw.machine,
          timestamp: new Date(raw.machine.timestamp),
        },
        recentAlerts: raw.recentAlerts.map((a) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })),
      };

      onMessage(payload);
    } catch (err) {
      console.error("[SSE] Failed to parse message:", err);
    }
  };

  es.onerror = onError;

  return () => es.close();
}
