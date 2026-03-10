/**
 * MetricCard: displays a single KPI with current value, trend indicator and max.
 *
 * Trend direction is visualised with a coloured arrow: up (▲) or down (▼).
 * For temperature, "up" is bad; for most others it depends on context.
 * Callers pass `trendDirection: "up" | "down" | "neutral"` and whether
 * "up" is the desired direction via `upIsGood`.
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";

type TrendDirection = "up" | "down" | "neutral";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  maxLabel?: string;
  trendDirection?: TrendDirection;
  upIsGood?: boolean; // does an upward trend represent a good state?
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  maxLabel,
  trendDirection = "neutral",
  upIsGood = true,
  icon,
  className,
}: MetricCardProps) {
  const isGoodTrend =
    trendDirection === "neutral" ||
    (upIsGood ? trendDirection === "up" : trendDirection === "down");

  const trendColor = {
    up: upIsGood
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-red-500 dark:text-red-400",
    down: upIsGood
      ? "text-red-500 dark:text-red-400"
      : "text-emerald-500 dark:text-emerald-400",
    neutral: "text-slate-400",
  }[trendDirection];

  const trendArrow =
    trendDirection === "up" ? "▲" : trendDirection === "down" ? "▼" : "–";

  return (
    <div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700",
        "p-5 shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {title}
        </p>
        {icon && (
          <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-none tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-slate-500 dark:text-slate-400 mb-0.5">
            {unit}
          </span>
        )}
        {trendDirection !== "neutral" && (
          <span className={cn("text-sm font-semibold mb-0.5", trendColor)}>
            {trendArrow}
          </span>
        )}
      </div>

      {/* Max / subtitle */}
      {maxLabel && (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {maxLabel}
        </p>
      )}
    </div>
  );
}
