"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useInterval } from "@textjs/app";
import type { Snapshot } from "./types";

interface LiveState {
  snapshot: Snapshot | null;
  error: string | null;
  refresh: () => void;
}

const LiveContext = createContext<LiveState>({ snapshot: null, error: null, refresh: () => {} });

/**
 * Polls the real host snapshot. The server caches collection for 2s, so a 2s
 * poll costs one `systemctl`/`docker`/`ss` sweep per tick, not one per client.
 */
export function LiveProvider({ children, interval = 2000 }: { children?: ReactNode; interval?: number }): ReactNode {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/live", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = (await response.json()) as Snapshot;
      setSnapshot(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useInterval(() => void load(), interval);

  return <LiveContext.Provider value={{ snapshot, error, refresh: load }}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveState {
  return useContext(LiveContext);
}
