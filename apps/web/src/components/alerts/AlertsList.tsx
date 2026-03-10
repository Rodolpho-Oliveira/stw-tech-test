/**
 * AlertsList: shows the recent alerts sorted by severity then timestamp.
 *
 * Critical alerts are visually prominent (red background) and trigger a
 * subtle CSS shake animation when they first appear.
 * Acknowledged alerts are dimmed and can be hidden with a toggle.
 */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Alert, AlertLevel } from "@industrial/types";

interface AlertsListProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  className?: string;
}

const LEVEL_CONFIG: Record<
  AlertLevel,
  { label: string; bg: string; border: string; dot: string; text: string }
> = {
  CRITICAL: {
    label: "Crítico",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-l-red-500",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
  },
  WARNING: {
    label: "Aviso",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-l-yellow-500",
    dot: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  INFO: {
    label: "Info",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-l-blue-400",
    dot: "bg-blue-400",
    text: "text-blue-700 dark:text-blue-400",
  },
};

// Sort order for severity
const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
};

function alertSortFn(a: Alert, b: Alert): number {
  // Unacknowledged first
  if (a.acknowledged !== b.acknowledged)
    return a.acknowledged ? 1 : -1;
  // Then by severity
  const pDiff = LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level];
  if (pDiff !== 0) return pDiff;
  // Then by recency
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

export function AlertsList({
  alerts,
  onAcknowledge,
  className,
}: AlertsListProps) {
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  // Track new CRITICAL alerts for sound / visual effect
  const prevAlertIds = useRef<Set<string>>(new Set());
  const [newCriticalId, setNewCriticalId] = useState<string | null>(null);

  useEffect(() => {
    for (const a of alerts) {
      if (
        a.level === "CRITICAL" &&
        !a.acknowledged &&
        !prevAlertIds.current.has(a.id)
      ) {
        setNewCriticalId(a.id);
        // Small browser beep via AudioContext (best-effort)
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.45);
        } catch {
          // AudioContext may be blocked – silently ignore
        }
        setTimeout(() => setNewCriticalId(null), 1_500);
      }
    }
    prevAlertIds.current = new Set(alerts.map((a) => a.id));
  }, [alerts]);

  const sorted = [...alerts].sort(alertSortFn);
  const visible = showAcknowledged
    ? sorted
    : sorted.filter((a) => !a.acknowledged);

  const acknowledgedCount = alerts.filter((a) => a.acknowledged).length;

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Alertas Recentes
          </h2>
          {alerts.filter((a) => !a.acknowledged && a.level === "CRITICAL")
            .length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>
        {acknowledgedCount > 0 && (
          <button
            onClick={() => setShowAcknowledged((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showAcknowledged
              ? "Ocultar reconhecidos"
              : `+${acknowledgedCount} reconhecidos`}
          </button>
        )}
      </div>

      {/* Alert list */}
      <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0 max-h-72">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-10 h-10 mb-2 opacity-40"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm">Nenhum alerta ativo</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((alert) => {
              const cfg = LEVEL_CONFIG[alert.level];
              const isNew = alert.id === newCriticalId;
              return (
                <li
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-3.5 border-l-4 transition-all duration-300",
                    cfg.bg,
                    cfg.border,
                    alert.acknowledged && "opacity-50",
                    isNew && "animate-slide-in"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                      cfg.dot,
                      alert.level === "CRITICAL" &&
                        !alert.acknowledged &&
                        "animate-pulse"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                        {alert.message}
                      </p>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          aria-label="Reconhecer alerta"
                          className="flex-shrink-0 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors mt-0.5"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3.5 h-3.5"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                          cfg.text,
                          "bg-current/10"
                        )}
                        style={{ backgroundColor: "transparent" }}
                      >
                        <span className={cfg.text}>{cfg.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {alert.component}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                        {formatRelativeTime(new Date(alert.timestamp))}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
