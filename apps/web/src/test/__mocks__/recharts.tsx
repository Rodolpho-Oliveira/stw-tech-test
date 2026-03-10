/**
 * Recharts mock.
 * Recharts uses ResizeObserver and SVG APIs that are not available in jsdom.
 * We replace all chart components with simple <div> stubs so component tests
 * can render without errors.
 */
import React from "react";

const stub =
  (name: string) =>
  ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": `recharts-${name}` }, children);

export const ResponsiveContainer = stub("responsive-container");
export const ComposedChart = stub("composed-chart");
export const LineChart = stub("line-chart");
export const Line = stub("line");
export const XAxis = stub("xaxis");
export const YAxis = stub("yaxis");
export const CartesianGrid = stub("cartesian-grid");
export const Tooltip = stub("tooltip");
export const Legend = stub("legend");
export const ReferenceLine = stub("reference-line");
