/**
 * MetricsChart: composite chart rendered with Recharts.
 *
 * Shows temperature (°C), RPM and efficiency (%) on a shared time axis.
 * Temperature and efficiency share the left Y-axis; RPM uses the right axis
 * because its scale (0–1500) would swamp the others.
 *
 * Recharts is rendered as a client component because it uses ResizeObserver
 * and other browser APIs.
 */
"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import type { MetricHistory } from "@industrial/types";

interface MetricsChartProps {
  data: MetricHistory[];
  className?: string;
}

type ActiveSeries = "temperature" | "rpm" | "efficiency";

// ─── Custom tooltip ──────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-slate-700 dark:text-slate-300">
            {item.name}:
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MetricsChart({ data, className }: MetricsChartProps) {
  const [active, setActive] = useState<Set<ActiveSeries>>(
    new Set(["temperature", "rpm", "efficiency"])
  );

  const toggleSeries = (key: ActiveSeries) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Always keep at least one series visible
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Transform data for Recharts – parse timestamp to display label
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: d.temperature,
    rpm: d.rpm,
    efficiency: d.efficiency,
  }));

  const seriesConfig: Array<{
    key: ActiveSeries;
    label: string;
    color: string;
    yAxisId: string;
    unit: string;
    referenceValue?: number;
  }> = [
    {
      key: "temperature",
      label: "Temperatura (°C)",
      color: "#f97316",
      yAxisId: "left",
      unit: "°C",
      referenceValue: 85, // critical threshold
    },
    {
      key: "rpm",
      label: "RPM",
      color: "#3b82f6",
      yAxisId: "right",
      unit: " RPM",
    },
    {
      key: "efficiency",
      label: "Eficiência (%)",
      color: "#10b981",
      yAxisId: "left",
      unit: "%",
    },
  ];

  if (!data.length) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-center h-72",
          className
        )}
      >
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Aguardando dados históricos…
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm animate-fade-in",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Histórico de Métricas
        </h2>

        {/* Series toggles */}
        <div className="flex flex-wrap gap-2">
          {seriesConfig.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                active.has(s.key)
                  ? "border-transparent text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-transparent"
              )}
              style={
                active.has(s.key)
                  ? { background: s.color }
                  : {}
              }
              aria-pressed={active.has(s.key)}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: active.has(s.key) ? "white" : s.color }}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            className="dark:[&>line]:stroke-slate-700"
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          {/* Left Y-axis: temperature + efficiency */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 120]}
            width={36}
          />
          {/* Right Y-axis: RPM */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 1800]}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ display: "none" }} />

          {/* Temperature critical threshold line */}
          {active.has("temperature") && (
            <ReferenceLine
              yAxisId="left"
              y={85}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: "Lim. 85°C", fontSize: 10, fill: "#ef4444", position: "right" }}
            />
          )}

          {seriesConfig.map((s) =>
            active.has(s.key) ? (
              <Line
                key={s.key}
                yAxisId={s.yAxisId}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                animationDuration={400}
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
