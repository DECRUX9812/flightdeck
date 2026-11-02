/**
 * Deterministic demo telemetry.
 *
 * Every number on screen is a pure function of the service id and the current
 * tick, so frames are reproducible (tests, screenshots, replays) while still
 * looking like a live feed. Nothing here talks to a network.
 */

export type ServiceStatus = "healthy" | "degraded" | "down" | "deploying";
export type Severity = "SEV-1" | "SEV-2" | "SEV-3";
export type IncidentState = "investigating" | "identified" | "monitoring" | "resolved";
export type DeployState = "queued" | "building" | "ready" | "failed";

export interface Service {
  id: string;
  name: string;
  owner: string;
  region: string;
  version: string;
  status: ServiceStatus;
  /** Baseline p95 in milliseconds. */
  p95: number;
  /** Baseline requests per second. */
  rps: number;
  /** Baseline error rate as a fraction (0.0042 = 0.42%). */
  err: number;
  /** Error budget remaining, 0..1. */
  budget: number;
  instances: number;
  summary: string;
}

export interface Region {
  id: string;
  city: string;
  availability: number;
  status: ServiceStatus;
}

export interface Deploy {
  id: string;
  service: string;
  version: string;
  actor: string;
  state: DeployState;
  /** 0..1 for the mock build bar. */
  progress: number;
  age: string;
}

export interface IncidentEvent {
  at: string;
  kind: "detected" | "paged" | "ack" | "note" | "resolved";
  text: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  state: IncidentState;
  opened: string;
  commander: string;
  service: string;
  impact: string;
  timeline: readonly IncidentEvent[];
}

/* ── deterministic noise ─────────────────────────────────────────────── */

const TWO_PI = Math.PI * 2;

/** Stable 0..1 seed for a string. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Smooth pseudo-noise in roughly -1..1, deterministic in (seed, i). */
export function noise(seed: number, i: number): number {
  return (
    Math.sin(i * 0.31 + seed * TWO_PI) * 0.55 +
    Math.sin(i * 0.83 + seed * 12.9898) * 0.3 +
    Math.sin(i * 1.97 + seed * 78.233) * 0.15
  );
}

export interface SeriesOptions {
  base: number;
  amp: number;
  min?: number;
  max?: number;
}

/** A `length`-point window ending at `tick`. */
export function series(seed: number, tick: number, length: number, opts: SeriesOptions): number[] {
  const { base, amp, min = 0, max = Number.POSITIVE_INFINITY } = opts;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const v = base + amp * noise(seed, tick - (length - 1 - i));
    out.push(Math.min(max, Math.max(min, v)));
  }
  return out;
}

/* ── formatters ──────────────────────────────────────────────────────── */

const int = new Intl.NumberFormat("en-US");

export function num(value: number): string {
  return int.format(Math.round(value));
}

export function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

export function ms(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

export function pct(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signed(value: number, digits = 1): string {
  const p = value * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
}

export function pad(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text.padEnd(width, " ");
}

export function clockFrom(secondsFromMidnight: number): string {
  const s = ((secondsFromMidnight % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

/* ── the fleet ───────────────────────────────────────────────────────── */

export const SERVICES: readonly Service[] = [
  {
    id: "api-gateway",
    name: "api-gateway",
    owner: "@platform",
    region: "iad1",
    version: "v4.12.0",
    status: "degraded",
    p95: 212,
    rps: 18400,
    err: 0.0042,
    budget: 0.38,
    instances: 24,
    summary: "Public REST + GraphQL edge. Terminates auth, rate limits and routing for every product surface.",
  },
  {
    id: "ingest",
    name: "ingest",
    owner: "@data",
    region: "iad1",
    version: "v9.3.1",
    status: "healthy",
    p95: 96,
    rps: 41200,
    err: 0.0002,
    budget: 0.91,
    instances: 48,
    summary: "Event intake. Durable buffer in front of the warehouse; the busiest process in the fleet.",
  },
  {
    id: "checkout",
    name: "checkout",
    owner: "@commerce",
    region: "sfo1",
    version: "v7.1.0",
    status: "degraded",
    p95: 640,
    rps: 3400,
    err: 0.012,
    budget: 0.12,
    instances: 16,
    summary: "Cart, tax, payment intent and order placement. Owns the revenue path.",
  },
  {
    id: "auth",
    name: "auth",
    owner: "@platform",
    region: "fra1",
    version: "v3.4.2",
    status: "healthy",
    p95: 34,
    rps: 8900,
    err: 0.0001,
    budget: 0.97,
    instances: 12,
    summary: "Sessions, tokens and machine identity. Single-digit-millisecond tail on purpose.",
  },
  {
    id: "search",
    name: "search",
    owner: "@discovery",
    region: "sin1",
    version: "v1.9.7",
    status: "healthy",
    p95: 78,
    rps: 6300,
    err: 0.0005,
    budget: 0.72,
    instances: 20,
    summary: "Query planning and ranking. Reads from a replicated index, never from the primary.",
  },
  {
    id: "billing",
    name: "billing",
    owner: "@fintech",
    region: "iad1",
    version: "v2.8.4",
    status: "healthy",
    p95: 148,
    rps: 1220,
    err: 0.0001,
    budget: 0.84,
    instances: 8,
    summary: "Metering, invoices and dunning. Every mutation is idempotent and written to the ledger.",
  },
  {
    id: "notify",
    name: "notify",
    owner: "@messaging",
    region: "iad1",
    version: "v5.0.2",
    status: "deploying",
    p95: 52,
    rps: 2140,
    err: 0.0003,
    budget: 0.66,
    instances: 10,
    summary: "Email, push and webhook fan-out with per-tenant rate limits and retries.",
  },
  {
    id: "cdn",
    name: "cdn",
    owner: "@growth",
    region: "iad1",
    version: "v2.1.0",
    status: "healthy",
    p95: 12,
    rps: 128000,
    err: 0.0001,
    budget: 0.95,
    instances: 64,
    summary: "Edge cache and asset signing. 94% hit rate; misses fall through to media.",
  },
  {
    id: "flags",
    name: "flags",
    owner: "@platform",
    region: "iad1",
    version: "v1.4.3",
    status: "healthy",
    p95: 8,
    rps: 22400,
    err: 0.00002,
    budget: 0.99,
    instances: 18,
    summary: "Feature-flag evaluation at the edge. Read-only, replicated, boring on purpose.",
  },
  {
    id: "analytics",
    name: "analytics",
    owner: "@data",
    region: "sfo1",
    version: "v6.0.0",
    status: "healthy",
    p95: 240,
    rps: 4800,
    err: 0.0009,
    budget: 0.61,
    instances: 20,
    summary: "Product analytics queries and rollups. Noisy neighbour of the warehouse.",
  },
  {
    id: "email",
    name: "email",
    owner: "@messaging",
    region: "fra1",
    version: "v3.2.1",
    status: "healthy",
    p95: 61,
    rps: 900,
    err: 0.0004,
    budget: 0.78,
    instances: 6,
    summary: "Transactional email, DKIM signing and bounce processing.",
  },
  {
    id: "media",
    name: "media",
    owner: "@growth",
    region: "gru1",
    version: "v0.9.1",
    status: "down",
    p95: 0,
    rps: 0,
    err: 1,
    budget: 0,
    instances: 6,
    summary: "Image transform and CDN origin. Currently failing health checks in gru1.",
  },
];

export const REGIONS: readonly Region[] = [
  { id: "iad1", city: "Ashburn", availability: 0.9999, status: "healthy" },
  { id: "sfo1", city: "San Francisco", availability: 0.9991, status: "degraded" },
  { id: "fra1", city: "Frankfurt", availability: 0.9998, status: "healthy" },
  { id: "sin1", city: "Singapore", availability: 0.9995, status: "healthy" },
  { id: "gru1", city: "São Paulo", availability: 0.9872, status: "down" },
];

export const DEPLOYS: readonly Deploy[] = [
  { id: "dpl_9f2a", service: "notify", version: "v5.0.2", actor: "@mira", state: "building", progress: 0.62, age: "40s" },
  { id: "dpl_7b40", service: "checkout", version: "v7.1.0", actor: "@you", state: "queued", progress: 0, age: "12s" },
  { id: "dpl_8c1d", service: "api-gateway", version: "v4.12.0", actor: "@dan", state: "ready", progress: 1, age: "6m" },
  { id: "dpl_6a92", service: "search", version: "v1.9.7", actor: "@lee", state: "failed", progress: 1, age: "22m" },
  { id: "dpl_5e13", service: "workers", version: "v4.12.0", actor: "@mira", state: "ready", progress: 1, age: "4h" },
];

export const INCIDENTS: readonly Incident[] = [
  {
    id: "INC-2413",
    title: "Elevated 5xx on api-gateway",
    severity: "SEV-2",
    state: "investigating",
    opened: "14m ago",
    commander: "@dan",
    service: "api-gateway",
    impact: "0.42% of requests failing · ~77 rps · 2 tenants paged",
    timeline: [
      { at: "14m", kind: "detected", text: "5xx rate over 0.10% for 5m (alert: gateway-5xx-burn)." },
      { at: "13m", kind: "paged", text: "Paged @oncall-platform · opened automatically." },
      { at: "11m", kind: "ack", text: "@dan acked · incident command taken." },
      { at: "9m", kind: "note", text: "Correlates with dpl_8c1d · deployed 6m earlier." },
      { at: "6m", kind: "note", text: "Rollback candidate ready · budget 38%." },
      { at: "4m", kind: "ack", text: "Mitigation: rolled back dpl_8c1d on 4 of 24 hosts." },
      { at: "2m", kind: "note", text: "5xx at 0.11% on rolled-back hosts · rollout paused." },
      { at: "1m", kind: "note", text: "Watching burn rate before declaring mitigated." },
    ],
  },
  {
    id: "INC-2412",
    title: "Ingest lag in iad1",
    severity: "SEV-3",
    state: "monitoring",
    opened: "1h 12m ago",
    commander: "@mira",
    service: "ingest",
    impact: "p99 ingest lag 42s (target < 10s) · no data loss",
    timeline: [
      { at: "1h 12m", kind: "detected", text: "Consumer lag above 30s on iad1 partitions." },
      { at: "1h 4m", kind: "note", text: "Rebalanced after broker restart · lag draining." },
      { at: "22m", kind: "note", text: "Lag down to 42s · monitoring for 1h." },
      { at: "58m", kind: "note", text: "Lag 28s and falling · no data loss observed." },
      { at: "40m", kind: "note", text: "Producer rate normalised · consumer catching up." },
    ],
  },
  {
    id: "INC-2411",
    title: "Checkout latency spike",
    severity: "SEV-1",
    state: "resolved",
    opened: "3h ago",
    commander: "@you",
    service: "checkout",
    impact: "p95 640ms for 28 minutes · 14 abandoned carts",
    timeline: [
      { at: "3h", kind: "detected", text: "p95 above 500ms for 10m on sfo1." },
      { at: "2h 51m", kind: "note", text: "Tax provider timeout 200ms → 900ms." },
      { at: "2h 44m", kind: "note", text: "Breaker tripped · fell back to cached rates." },
      { at: "2h 20m", kind: "note", text: "Provider confirmed healthy · breaker reset by hand." },
      { at: "2h 32m", kind: "resolved", text: "p95 back to 180ms · incident closed." },
    ],
  },
];

/* ── derived live values ─────────────────────────────────────────────── */

export interface LiveService extends Service {
  liveP95: number;
  liveRps: number;
  liveErr: number;
  liveBudget: number;
}

export function liveService(service: Service, tick: number): LiveService {
  const seed = hash(service.id);
  if (service.status === "down") {
    return { ...service, liveP95: 0, liveRps: 0, liveErr: 1, liveBudget: 0 };
  }
  const drift = noise(seed, tick / 3);
  const burst = service.status === "degraded" ? 0.18 : 0.08;
  return {
    ...service,
    liveP95: Math.max(1, Math.round(service.p95 * (1 + burst * drift))),
    liveRps: Math.max(0, Math.round(service.rps * (1 + 0.05 * noise(seed + 0.4, tick / 4)))),
    liveErr: Math.max(0, service.err * (1 + 0.35 * noise(seed + 0.7, tick / 5))),
    liveBudget: Math.max(0, Math.min(1, service.budget - Math.max(0, drift) * 0.01)),
  };
}

/** Aggregate fleet numbers shown on the overview. */
export function fleetTotals(tick: number): { rps: number; p95: number; err: number; budget: number; healthy: number } {
  const live = SERVICES.map((s) => liveService(s, tick));
  const rps = live.reduce((sum, s) => sum + s.liveRps, 0);
  const weightedErr = live.reduce((sum, s) => sum + s.liveErr * s.liveRps, 0) / Math.max(1, rps);
  const budget = live.reduce((sum, s) => sum + s.liveBudget, 0) / live.length;
  const p95 = Math.max(...live.map((s) => s.liveP95));
  const healthy = live.filter((s) => s.status === "healthy").length;
  return { rps, p95, err: weightedErr, budget, healthy };
}

export const STATUS_COLOR: Record<ServiceStatus, string> = {
  healthy: "success",
  degraded: "warning",
  down: "danger",
  deploying: "info",
};

export const STATUS_MARK: Record<ServiceStatus, string> = {
  healthy: "●",
  degraded: "◐",
  down: "✕",
  deploying: "◌",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  "SEV-1": "danger",
  "SEV-2": "warning",
  "SEV-3": "info",
};

export const INCIDENT_COLOR: Record<IncidentState, string> = {
  investigating: "warning",
  identified: "warning",
  monitoring: "info",
  resolved: "success",
};

export const DEPLOY_COLOR: Record<DeployState, string> = {
  queued: "muted",
  building: "warning",
  ready: "success",
  failed: "danger",
};

/* ── live activity log ───────────────────────────────────────────────── */

const ACTORS = ["@mira", "@dan", "@lee", "@you", "@ada", "@kim"];
const VERBS = [
  "promoted dpl_8c1d to prod",
  "opened a rollback for checkout",
  "acked page gateway-5xx-burn",
  "scaled ingest to 48 instances",
  "merged feat/console-first",
  "rotated the billing signing key",
  "muted alert search-p99 for 30m",
  "pinned workers to v4.12.0",
];

/** A rolling event log; entry 0 is the newest and times descend by 23s. */
export function activityFeed(tick: number, count = 6, nowSeconds?: number): Array<{ time: string; text: string }> {
  const now = nowSeconds ?? 16 * 3600 + 42 * 60 + (tick % 60);
  const entries: Array<{ time: string; text: string }> = [];
  for (let i = 0; i < count; i++) {
    const chunk = Math.floor(tick / 3) - i;
    const seed = hash(`evt-${chunk}`);
    const actor = ACTORS[(Math.floor(seed * 997) + chunk * 5) % ACTORS.length] ?? "@you";
    const verb = VERBS[(Math.floor(seed * 883) + chunk * 3) % VERBS.length] ?? "deployed";
    entries.push({ time: clockFrom(now - i * 23), text: `${actor} ${verb}` });
  }
  return entries;
}

/** Padded min/max for a series so a narrow range still reads as a chart. */
export function bounds(values: readonly number[], pad = 0.08): { min: number; max: number; span: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.02, 1);
  return { min: lo - span * pad, max: hi + span * pad, span: hi - lo };
}

/** Build progress for the deploy queue, animated from the tick. */
export function deployProgress(deploy: Deploy, tick: number): number {
  if (deploy.state === "ready" || deploy.state === "failed") return 1;
  if (deploy.state === "queued") return 0;
  return Math.min(0.98, deploy.progress + (tick % 40) * 0.004);
}
