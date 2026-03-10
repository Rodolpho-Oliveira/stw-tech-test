/**
 * MachineStateCard: prominent card showing the machine operational state.
 *
 * Uses colour + animation to immediately communicate state:
 * - RUNNING  → green, pulsing dot
 * - STOPPED  → slate, no animation
 * - MAINTENANCE → blue, slow pulse
 * - ERROR    → red, fast pulse + shake animation
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { MachineState } from "@industrial/types";

interface MachineStateCardProps {
  state: MachineState | null;
}

const STATE_CONFIG: Record<
  MachineState,
  {
    label: string;
    subtitle: string;
    bg: string;
    border: string;
    dot: string;
    text: string;
    badge: string;
  }
> = {
  RUNNING: {
    label: "Ligada",
    subtitle: "Status: OK",
    bg: "bg-white dark:bg-slate-900",
    border: "border-emerald-300 dark:border-emerald-700",
    dot: "bg-emerald-500 animate-pulse",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  STOPPED: {
    label: "Desligada",
    subtitle: "Status: Parada",
    bg: "bg-white dark:bg-slate-900",
    border: "border-slate-300 dark:border-slate-600",
    dot: "bg-slate-400",
    text: "text-slate-500 dark:text-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  MAINTENANCE: {
    label: "Manutenção",
    subtitle: "Status: Em serviço",
    bg: "bg-white dark:bg-slate-900",
    border: "border-blue-300 dark:border-blue-700",
    dot: "bg-blue-500 animate-pulse-slow",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  ERROR: {
    label: "Erro",
    subtitle: "Atenção necessária",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-400 dark:border-red-600",
    dot: "bg-red-500 animate-ping",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

export function MachineStateCard({ state }: MachineStateCardProps) {
  if (!state) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    );
  }

  const config = STATE_CONFIG[state];

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-5 shadow-sm transition-all duration-300 animate-fade-in",
        config.bg,
        config.border
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Estado da Máquina
        </p>
        {/* Live indicator */}
        <div className="relative w-3 h-3">
          <span className={cn("absolute inset-0 rounded-full", config.dot)} />
        </div>
      </div>

      <p className={cn("text-2xl sm:text-3xl font-bold leading-none", config.text)}>
        {config.label}
      </p>

      <div className="mt-3">
        <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", config.badge)}>
          {config.subtitle}
        </span>
      </div>
    </div>
  );
}
