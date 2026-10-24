"use client";

import { useEffect, useState } from "react";
import type { Status } from "./types";

/**
 * Chart colours, validated with the dataviz palette checker against white
 * (light) and slate-900 (dark) surfaces. Stacks must keep the STATUSES order
 * (Complete → In Progress → Pending → Rejected): that adjacency is what passes
 * the colour-blind separation check. Light yellow is below 3:1 contrast, so
 * every chart also carries labels, an icon legend and a table view.
 */
const LIGHT = {
  status: { Complete: "#0ca30c", "In Progress": "#2a78d6", Pending: "#eda100", Rejected: "#d03b3b" } as Record<Status, string>,
  series: "#2a78d6",
  surface: "#ffffff",
  grid: "#e2e8f0",
  axis: "#94a3b8",
  text: "#475569",
};

const DARK: typeof LIGHT = {
  status: { Complete: "#0ca30c", "In Progress": "#3987e5", Pending: "#c98500", Rejected: "#d03b3b" },
  series: "#3987e5",
  surface: "#0f172a",
  grid: "#1e293b",
  axis: "#64748b",
  text: "#cbd5e1",
};

export type ChartTheme = typeof LIGHT;

export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark ? DARK : LIGHT;
}
