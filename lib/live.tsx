"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useInterval } from "@textjs/app";

/**
 * One shared 1 Hz heartbeat for the whole app. Every page derives its live
 * numbers from this tick, so a single interval drives the entire console —
 * no per-card timers, no drift between charts.
 */
const TickContext = createContext(0);

/** Demo mode: `?tick=150` speeds the heartbeat up for screen recordings. */
function tickIntervalFromUrl(): number {
  if (typeof window === "undefined") return 1000;
  const value = Number(new URLSearchParams(window.location.search).get("tick"));
  return Number.isFinite(value) && value >= 60 ? value : 1000;
}

export function LiveProvider({ children, interval }: { children?: ReactNode; interval?: number }): ReactNode {
  const [resolved] = useState(() => interval ?? tickIntervalFromUrl());
  const [tick, setTick] = useState(0);
  useInterval(() => setTick((t) => t + 1), resolved);
  return <TickContext.Provider value={tick}>{children}</TickContext.Provider>;
}

export function useTick(): number {
  return useContext(TickContext);
}

/** Seconds since local midnight; re-read on every tick so fast demo mode stays honest. */
export function useClockSeconds(): number {
  useTick();
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}
