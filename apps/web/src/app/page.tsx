/**
 * Dashboard page – the main view.
 *
 * This is a client component because it consumes the useMachineData hook
 * which opens an SSE connection.  Next.js 14 allows "use client" on page
 * components; we just lose the default server-side rendering for this route
 * which is acceptable given the data changes every 3 seconds anyway.
 */
"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";
import { MachineStateCard } from "@/components/dashboard/MachineStateCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricsChart } from "@/components/charts/MetricsChart";
import { AlertsList } from "@/components/alerts/AlertsList";
import { EfficiencyMetrics } from "@/components/dashboard/EfficiencyMetrics";
import { useMachineData } from "@/hooks/useMachineData";
import { formatUptime } from "@/lib/utils";

/**
 * Determine trend direction by comparing the last two data points.
 * Returns "up", "down", or "neutral".
 */
function getTrend(
  current: number,
  history: { temperature: number; rpm: number; efficiency: number }[],
  key: "temperature" | "rpm" | "efficiency"
): "up" | "down" | "neutral" {
  if (history.length < 2) return "neutral";
  const previous = history[history.length - 2][key];
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return "neutral";
  return delta > 0 ? "up" : "down";
}

export default function DashboardPage() {
  const { machine, alerts, history, connectionStatus, lastUpdated, acknowledge } =
    useMachineData();

  const tempTrend = machine
    ? getTrend(machine.metrics.temperature, history, "temperature")
    : "neutral";
  const rpmTrend = machine
    ? getTrend(machine.metrics.rpm, history, "rpm")
    : "neutral";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header connectionStatus={connectionStatus} lastUpdated={lastUpdated} />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─── Row 1: KPI cards ──────────────────────────────────────────── */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          aria-label="Indicadores principais"
        >
          <MachineStateCard state={machine?.state ?? null} />

          <MetricCard
            title="Temperatura"
            value={machine?.metrics.temperature.toFixed(1) ?? "—"}
            unit="°C"
            maxLabel="Máx: 85°C"
            trendDirection={tempTrend}
            upIsGood={false} // higher temperature is bad
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            }
          />

          <MetricCard
            title="RPM"
            value={machine?.metrics.rpm.toFixed(0) ?? "—"}
            maxLabel="Máx: 1500"
            trendDirection={rpmTrend}
            upIsGood={true}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            }
          />

          <MetricCard
            title="Tempo de Operação"
            value={machine ? formatUptime(machine.metrics.uptime) : "—"}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
        </section>

        {/* ─── Row 2: Historical chart ────────────────────────────────────── */}
        <section aria-label="Gráfico histórico de métricas">
          <MetricsChart data={history} />
        </section>

        {/* ─── Row 3: Alerts + OEE ───────────────────────────────────────── */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          aria-label="Alertas e eficiência"
        >
          <AlertsList
            alerts={alerts}
            onAcknowledge={acknowledge}
            className="min-h-[280px]"
          />
          <EfficiencyMetrics
            oee={machine?.oee ?? null}
            className="min-h-[280px]"
          />
        </section>

      </main>

      {/* Sticky footer – version / credits */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-8 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Dashboard Industrial v1.0 · Misturador M-01 · Dados simulados em tempo real
      </footer>
    </div>
  );
}
