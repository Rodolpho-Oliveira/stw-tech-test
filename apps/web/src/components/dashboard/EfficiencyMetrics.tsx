/**
 * EfficiencyMetrics: OEE panel with gauge bars for each sub-metric.
 *
 * OEE breakdown:
 *   - Disponibilidade (Availability)
 *   - Performance
 *   - Qualidade (Quality)
 *   - OEE geral (= A × P × Q / 10 000)
 *
 * Each metric is visualised with a labelled progress bar that changes
 * colour based on the value (green ≥ 90%, yellow ≥ 75%, red < 75%).
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { OEE } from "@industrial/types";

interface EfficiencyMetricsProps {
  oee: OEE | null;
  className?: string;
}

function barColor(value: number): string {
  if (value >= 90) return "bg-emerald-500";
  if (value >= 75) return "bg-yellow-400";
  return "bg-red-500";
}

function textColor(value: number): string {
  if (value >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface MetricBarProps {
  label: string;
  value: number;
  tooltip?: string;
}

function MetricBar({ label, value, tooltip }: MetricBarProps) {
  return (
    <div title={tooltip}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className={cn("text-xs font-bold tabular-nums", textColor(value))}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function EfficiencyMetrics({ oee, className }: EfficiencyMetricsProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm animate-fade-in",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Métricas de Eficiência
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          OEE
        </span>
      </div>

      {oee ? (
        <div className="space-y-4">
          {/* Big OEE number */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">OEE Geral</p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  textColor(oee.overall)
                )}
              >
                {oee.overall.toFixed(1)}%
              </p>
            </div>
            {/* Radial gauge (CSS-only) */}
            <div className="ml-auto relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke={oee.overall >= 90 ? "#10b981" : oee.overall >= 75 ? "#facc15" : "#ef4444"}
                  strokeDasharray={`${oee.overall} ${100 - oee.overall}`}
                  strokeDashoffset="0"
                />
              </svg>
              <span className={cn(
                "absolute inset-0 flex items-center justify-center text-[9px] font-bold rotate-0",
                textColor(oee.overall)
              )}>
                {Math.round(oee.overall)}%
              </span>
            </div>
          </div>

          <MetricBar
            label="Disponibilidade"
            value={oee.availability}
            tooltip="Uptime real / tempo total planejado"
          />
          <MetricBar
            label="Performance"
            value={oee.performance}
            tooltip="Velocidade real vs. velocidade teórica"
          />
          <MetricBar
            label="Qualidade"
            value={oee.quality}
            tooltip="Produtos conformes / total produzido"
          />
        </div>
      ) : (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-1.5" />
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
