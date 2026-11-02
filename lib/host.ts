/**
 * Real host telemetry for Flightdeck Live.
 *
 * Everything here reads the machine the server is running on: systemd units,
 * Docker containers, listening TCP ports (probed for real latency), /proc and
 * journalctl. No fixtures, no random numbers.
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";

export * from "./types.ts";
import type { HostStats, ListeningPort, Problem, Sample, Service, ServiceKind, ServiceState, Snapshot } from "./types.ts";
import { runChecks, type HttpCheckConfig } from "./checks.ts";
import { humanAge } from "./format.ts";

const RUN = { timeout: 4000, maxBuffer: 1024 * 1024 } as const;

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, RUN, (error, stdout) => resolve(error && !stdout ? "" : stdout));
  });
}

/** TCP connect probe with a hard timeout; returns ms or null. */
export function probeTcp(host: string, port: number, timeoutMs = 250): Promise<number | null> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const socket = new net.Socket();
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(Number(process.hrtime.bigint() - started) / 1e6));
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));
    socket.connect(port, host);
  });
}

/* ── parsers (exported for tests) ─────────────────────────────────────── */

/** Dots and colons in a path 404 in the dev server, so ids are slugs. */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseSystemdUnits(text: string, scope: "system" | "user"): Service[] {
  const out: Service[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("●") || trimmed.startsWith("UNIT")) continue;
    // unit load active sub description...
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4 || !parts[0]?.includes(".")) continue;
    const [, , active, sub, ...rest] = parts;
    if (!active || !sub) continue;
    const state: ServiceState =
      sub === "auto-restart" || active === "activating" || sub === "start" || sub === "start-pre"
        ? "restarting"
        : active === "failed" || sub === "failed"
          ? "failed"
          : active === "active" && sub === "running"
            ? "running"
            : "inactive";
    out.push({
      id: `systemd-${scope}-${slug(parts[0]!)}`,
      name: parts[0]!,
      kind: "systemd",
      scope,
      state,
      description: rest.join(" ").trim(),
    });
  }
  return out;
}

export function parseDockerPs(text: string): Service[] {
  const out: Service[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, status, image] = trimmed.split("|");
    if (!name || !status) continue;
    const lower = status.toLowerCase();
    const state: ServiceState = lower.startsWith("up")
      ? lower.includes("unhealthy")
        ? "failed"
        : "running"
      : lower.startsWith("restarting")
        ? "restarting"
        : "inactive";
    out.push({
      id: `docker-${slug(name)}`,
      name,
      kind: "docker",
      state,
      description: image ?? "",
      since: status.replace(/^Up\s+/, "").replace(/\s*\(.*\)$/, ""),
    });
  }
  return out;
}

export function parseListeningPorts(text: string): ListeningPort[] {
  const seen = new Map<string, ListeningPort>();
  for (const line of text.split("\n")) {
    const cols = line.trim().split(/\s+/);
    const local = cols[3];
    if (!local || !local.includes(":")) continue;
    const port = Number(local.slice(local.lastIndexOf(":") + 1));
    if (!Number.isInteger(port) || port <= 0) continue;
    let address = local.slice(0, local.lastIndexOf(":"));
    if (address.startsWith("[")) address = address.slice(1, -1);
    const key = address + ":" + port;
    if (seen.has(key)) continue;
    const procMatch = /users:\(\("([^"]+)"/.exec(line);
    seen.set(key, { port, address, proc: procMatch?.[1] ?? "" });
  }
  return [...seen.values()];
}

/** A wildcard bind is only reachable on loopback; a specific bind is reachable at its address. */
export function probeAddress(address: string): string {
  const bare = address.split("%")[0] ?? "";
  if (!bare || bare === "*" || bare === "0.0.0.0" || bare === "::") return "127.0.0.1";
  return bare;
}

export function parseMeminfo(text: string): { totalMiB: number; usedMiB: number; swapUsedMiB: number } {
  const value = (key: string): number => {
    const match = new RegExp(`^${key}:\\s+(\\d+) kB`, "m").exec(text);
    return match ? Number(match[1]) / 1024 : 0;
  };
  const total = value("MemTotal");
  const available = value("MemAvailable");
  const swapTotal = value("SwapTotal");
  const swapFree = value("SwapFree");
  return {
    totalMiB: Math.round(total),
    usedMiB: Math.round(Math.max(0, total - available)),
    swapUsedMiB: Math.round(Math.max(0, swapTotal - swapFree)),
  };
}

export function parseCpuStat(text: string): number {
  const line = text.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return 0;
  const v = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = (v[3] ?? 0) + (v[4] ?? 0);
  const total = v.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  return total > 0 ? ((total - idle) / total) * 100 : 0;
}

export { humanAge };

/** One probe per port; a Tailscale-only bind wins over a loopback duplicate. */
function dedupePorts(ports: ListeningPort[]): ListeningPort[] {
  const byPort = new Map<number, ListeningPort>();
  for (const port of ports) {
    const current = byPort.get(port.port);
    if (!current || (current.address === "127.0.0.1" && port.address !== "127.0.0.1")) byPort.set(port.port, port);
  }
  return [...byPort.values()];
}

/* ── collection ───────────────────────────────────────────────────────── */

interface Cached {
  at: number;
  snapshot: Snapshot;
}

let cache: Cached | null = null;
let lastCpu: { total: number; idle: number } | null = null;
const history: Sample[] = [];

/** CPU percent from two /proc/stat reads; keeps a module-level previous sample. */
function cpuPercent(text: string): number {
  const line = text.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return 0;
  const v = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = (v[3] ?? 0) + (v[4] ?? 0);
  const total = v.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  const prev = lastCpu;
  lastCpu = { total, idle };
  if (!prev || total <= prev.total) return 0;
  const dTotal = total - prev.total;
  const dIdle = idle - prev.idle;
  return Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100));
}

async function collectOnce(): Promise<Snapshot> {
  const [sysRunning, sysFailed, userRunning, userFailed, dockerPs, ssOut, meminfo, stat, loadavg, uptime, df] =
    await Promise.all([
      run("systemctl", ["list-units", "--type=service", "--state=running", "--no-legend", "--plain"]),
      run("systemctl", ["list-units", "--type=service", "--state=failed", "--no-legend", "--plain"]),
      run("systemctl", ["--user", "list-units", "--type=service", "--state=running", "--no-legend", "--plain"]),
      run("systemctl", ["--user", "list-units", "--type=service", "--state=failed", "--no-legend", "--plain"]),
      run("docker", ["ps", "-a", "--format", "{{.Names}}|{{.Status}}|{{.Image}}"]),
      run("ss", ["-ltnpH"]),
      readFile("/proc/meminfo", "utf8").catch(() => ""),
      readFile("/proc/stat", "utf8").catch(() => ""),
      readFile("/proc/loadavg", "utf8").catch(() => ""),
      readFile("/proc/uptime", "utf8").catch(() => ""),
      run("df", ["-P", "/"]),
    ]);

  const systemd = [
    ...parseSystemdUnits(sysRunning, "system"),
    ...parseSystemdUnits(sysFailed, "system"),
    ...parseSystemdUnits(userRunning, "user"),
    ...parseSystemdUnits(userFailed, "user"),
  ];
  const docker = parseDockerPs(dockerPs);
  const ports = dedupePorts(parseListeningPorts(ssOut)).slice(0, 10);

  const probes: Array<ListeningPort & { latencyMs: number | null }> = [];
  for (const port of ports) {
    probes.push({ ...port, latencyMs: await probeTcp(probeAddress(port.address), port.port) });
  }

  const probeServices: Service[] = probes.map((p) => ({
    id: `port-${p.port}`,
    name: `:${p.port}`,
    kind: "port",
    state: p.latencyMs === null ? "failed" : "running",
    description: `${p.proc || "process"} on ${p.address}:${p.port}`,
    port: p.port,
    latencyMs: p.latencyMs,
  }));

  const services = [...systemd, ...docker, ...probeServices];

  const mem = parseMeminfo(meminfo);
  let cpu = 0;
  if (!lastCpu) {
    cpuPercent(stat);
    await new Promise((r) => setTimeout(r, 120));
    const fresh = await readFile("/proc/stat", "utf8").catch(() => "");
    cpu = cpuPercent(fresh);
  } else {
    cpu = cpuPercent(stat);
  }
  const loads = loadavg.trim().split(/\s+/).map(Number);
  const dfLine = df.split("\n")[1]?.trim().split(/\s+/) ?? [];
  const diskPct = Number((dfLine[4] ?? "0").replace("%", "")) || 0;

  const host: HostStats = {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    uptimeSec: Math.round(Number(uptime.split(" ")[0] ?? 0)),
    load1: loads[0] ?? 0,
    load5: loads[1] ?? 0,
    load15: loads[2] ?? 0,
    cpuPct: Math.round(cpu * 10) / 10,
    cores: os.cpus().length,
    memTotalMiB: mem.totalMiB,
    memUsedMiB: mem.usedMiB,
    memPct: mem.totalMiB ? Math.round((mem.usedMiB / mem.totalMiB) * 1000) / 10 : 0,
    swapUsedMiB: mem.swapUsedMiB,
    diskPct,
    diskUsedGiB: Number(dfLine[2] ?? 0) / 1024 / 1024,
    diskTotalGiB: Number(dfLine[1] ?? 0) / 1024 / 1024,
    procs: Number(loadavg.trim().split(/\s+/)[3]?.split("/")[1] ?? 0),
  };

  const failedUnits = [
    ...parseSystemdUnits(sysFailed, "system"),
    ...parseSystemdUnits(userFailed, "user"),
  ];

  const problems: Problem[] = [];
  for (const unit of failedUnits) {
    problems.push({
      id: unit.id,
      severity: unit.scope === "user" ? "SEV-3" : "SEV-2",
      title: `${unit.name} failed`,
      detail: unit.description || "unit is in a failed state",
      scope: "systemd",
      since: "now",
    });
  }
  for (const container of docker.filter((d) => d.state === "failed")) {
    problems.push({
      id: container.id,
      severity: "SEV-1",
      title: `${container.name} unhealthy`,
      detail: container.description,
      scope: "docker",
      since: container.since ?? "unknown",
    });
  }
  for (const probe of probes.filter((p) => p.latencyMs === null)) {
    problems.push({
      id: `port-${probe.port}`,
      severity: "SEV-2",
      title: `port ${probe.port} not answering`,
      detail: `listening on :${probe.port} but no TCP handshake within 250ms`,
      scope: "network",
      since: "now",
    });
  }
  if (host.diskPct >= 90) {
    problems.push({
      id: "host:disk",
      severity: host.diskPct >= 95 ? "SEV-1" : "SEV-2",
      title: `root filesystem at ${host.diskPct}%`,
      detail: `${host.diskUsedGiB.toFixed(0)} GiB of ${host.diskTotalGiB.toFixed(0)} GiB used`,
      scope: host.hostname,
      since: "persistent",
    });
  }
  if (host.memPct >= 90) {
    problems.push({
      id: "host:mem",
      severity: "SEV-2",
      title: `memory at ${host.memPct}%`,
      detail: `${host.memUsedMiB} MiB of ${host.memTotalMiB} MiB used`,
      scope: host.hostname,
      since: "now",
    });
  }
  if (host.load1 > host.cores * 1.5) {
    problems.push({
      id: "host:load",
      severity: "SEV-3",
      title: `load ${host.load1.toFixed(1)} on ${host.cores} cores`,
      detail: "run queue is above 1.5× core count",
      scope: host.hostname,
      since: "now",
    });
  }

  const checks = await runChecks(await loadChecks());
  for (const check of checks.filter((entry) => !entry.ok)) {
    problems.push({
      id: `check-${check.name}`,
      severity: "SEV-1",
      title: `${check.name} is not answering`,
      detail: `${check.url} · ${check.error ?? `HTTP ${check.status}`}`,
      scope: "http",
      since: "now",
    });
  }

  const down = services.filter((s) => s.state === "failed").length;
  history.push({ at: Date.now(), load1: host.load1, memPct: host.memPct, cpuPct: host.cpuPct, down });
  while (history.length > 60) history.shift();

  const counts = {
    total: services.length,
    running: services.filter((s) => s.state === "running").length,
    failed: down,
    docker: docker.length,
    systemd: systemd.length,
    probes: probes.length,
    up: probes.filter((p) => p.latencyMs !== null).length,
  };

  return {
    generatedAt: Date.now(),
    host,
    services,
    problems,
    ports: probes.map((p) => ({ port: p.port, latencyMs: p.latencyMs, ok: p.latencyMs !== null, proc: p.proc })),
    history: [...history],
    checks,
    platform: process.platform,
    counts,
  };
}

/** Optional endpoint checks, from flightdeck.config.json next to the app. */
export async function loadChecks(): Promise<HttpCheckConfig[]> {
  try {
    const raw = await readFile(new URL("../flightdeck.config.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw) as { checks?: HttpCheckConfig[] };
    return Array.isArray(parsed.checks) ? parsed.checks.slice(0, 12) : [];
  } catch {
    return [];
  }
}

/** Cached for `ttlMs` so a page refresh storm cannot fork-bomb the box. */
export async function collect(ttlMs = 2000): Promise<Snapshot> {
  if (cache && Date.now() - cache.at < ttlMs) return cache.snapshot;
  const snapshot = await collectOnce();
  cache = { at: Date.now(), snapshot };
  return snapshot;
}

/** Last N journal lines for a unit or container, for the detail page. */
export async function journalFor(id: string, lines = 8): Promise<string[]> {
  const snapshot = await collect();
  const service = snapshot.services.find((entry) => entry.id === id);
  if (!service) return [];

  if (service.kind === "systemd") {
    const args = ["-u", service.name, "-n", String(lines), "--no-pager", "-o", "short-iso", "--no-hostname"];
    const out = await run("journalctl", service.scope === "user" ? ["--user", ...args] : args);
    return out.trim().split("\n").filter(Boolean).slice(-lines);
  }
  if (service.kind === "docker") {
    const out = await run("docker", ["logs", "--tail", String(lines), service.name]);
    return out.trim().split("\n").filter(Boolean).slice(-lines);
  }
  return [];
}

/** The plain-text board: what CI, cron and Slack actually get. */
export function renderText(snapshot: Snapshot): string {
  const { host, services, problems, counts, history } = snapshot;
  const line = "─".repeat(66);
  const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s.padEnd(n));
  const bar = (pct: number, width = 20) => {
    const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width);
    return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
  };

  const lines: string[] = [];
  lines.push(`FLIGHTDECK  ${host.hostname}  ${new Date(snapshot.generatedAt).toISOString()}`);
  lines.push(line);
  lines.push(`load   ${host.load1.toFixed(2)} / ${host.cores} cores     cpu ${host.cpuPct.toFixed(1)}%`);
  lines.push(`mem    ${bar(host.memPct)} ${host.memPct.toFixed(1)}%  ${host.memUsedMiB}/${host.memTotalMiB} MiB`);
  lines.push(`disk   ${bar(host.diskPct)} ${host.diskPct}%  ${host.diskUsedGiB.toFixed(0)}/${host.diskTotalGiB.toFixed(0)} GiB`);
  lines.push(`uptime ${humanAge(host.uptimeSec)}   services ${counts.running}/${counts.total} up   probes ${counts.up}/${counts.probes}`);
  lines.push(line);
  if (problems.length === 0) {
    lines.push("no problems found");
  } else {
    lines.push(`${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    for (const problem of problems.slice(0, 8)) {
      lines.push(`  ${problem.severity}  ${pad(problem.title, 40)} ${problem.scope}`);
    }
  }
  const failed = services.filter((s) => s.state === "failed").slice(0, 10);
  if (failed.length) {
    lines.push(line);
    lines.push("down:");
    for (const service of failed) lines.push(`  ${service.kind.padEnd(7)} ${service.name}`);
  }
  if (history.length > 2) {
    const sparks = "▁▂▃▄▅▆▇█";
    const spark = (values: number[], max: number) =>
      values.map((v) => sparks[Math.max(0, Math.min(7, Math.round((v / (max || 1)) * 7)))]).join("");
    lines.push(line);
    lines.push(`load   ${spark(history.map((h) => h.load1), Math.max(...history.map((h) => h.load1), 1))}`);
    lines.push(`mem    ${spark(history.map((h) => h.memPct), 100)}`);
  }
  lines.push(line);
  lines.push(`flightdeck · ${counts.systemd} systemd · ${counts.docker} docker · ${counts.probes} probes`);
  return lines.join("\n");
}
