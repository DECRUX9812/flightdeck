/** Shared shapes for the live host snapshot (no node imports: safe on the client). */

export type ServiceKind = "systemd" | "docker" | "port";
export type ServiceState = "running" | "failed" | "inactive" | "restarting" | "unknown";

export interface Service {
  id: string;
  name: string;
  kind: ServiceKind;
  /** systemd scope, when kind is systemd. */
  scope?: "system" | "user";
  state: ServiceState;
  description: string;
  port?: number;
  /** TCP connect time in ms for a listening port, null when it did not answer. */
  latencyMs?: number | null;
  memoryMiB?: number | null;
  restarts?: number | null;
  /** Human age of the current state, e.g. "2h 14m". */
  since?: string;
}

export interface HostStats {
  hostname: string;
  platform: string;
  uptimeSec: number;
  load1: number;
  load5: number;
  load15: number;
  cpuPct: number;
  cores: number;
  memTotalMiB: number;
  memUsedMiB: number;
  memPct: number;
  swapUsedMiB: number;
  diskPct: number;
  diskUsedGiB: number;
  diskTotalGiB: number;
  procs: number;
}

export interface Problem {
  id: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  title: string;
  detail: string;
  scope: string;
  since: string;
}

export interface Sample {
  at: number;
  load1: number;
  memPct: number;
  cpuPct: number;
  down: number;
}

export interface HttpCheck {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error?: string;
  tlsDaysLeft?: number | null;
}

export interface Snapshot {
  generatedAt: number;
  host: HostStats;
  services: Service[];
  problems: Problem[];
  ports: Array<{ port: number; latencyMs: number | null; ok: boolean; proc: string }>;
  history: Sample[];
  checks: HttpCheck[];
  platform: string;
  counts: { total: number; running: number; failed: number; docker: number; systemd: number; probes: number; up: number };
}


export interface ListeningPort {
  port: number;
  address: string;
  proc: string;
}
