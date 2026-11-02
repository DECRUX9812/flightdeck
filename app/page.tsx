"use client";

import type { ReactNode } from "react";
import { Badge, Box, Divider, ProgressBar, Sparkline, Text, renderAsciiFont, useTheme, type Metadata } from "@textjs/app";
import Link from "@textjs/app/link";
import { humanAge } from "../lib/format";
import { useLive } from "../lib/useLive";
import { MetricCard, Panel, Stat } from "../components/ui";

export const metadata: Metadata = { title: "Overview" };

const WORDMARK = renderAsciiFont("FLIGHTDECK", "compact", 2).join("\n");

export default function OverviewPage(): ReactNode {
  const theme = useTheme();
  const { snapshot, error } = useLive();

  if (error) {
    return (
      <Box className="flex-col grow items-center justify-center gap-1">
        <Text bold color={theme.danger}>
          cannot reach /api/live
        </Text>
        <Text color={theme.muted}>{error}</Text>
        <Text color={theme.subtle}>is the route handler running? try restarting `npm run dev`</Text>
      </Box>
    );
  }

  if (!snapshot) {
    return (
      <Box className="flex-col grow items-center justify-center">
        <Text color={theme.muted}>reading the machine…</Text>
      </Box>
    );
  }

  const { host, services, problems, ports, counts, history } = snapshot;
  const loadSeries = history.map((h) => h.load1);
  const cpuSeries = history.map((h) => h.cpuPct);
  const memSeries = history.map((h) => h.memPct);
  const downSeries = history.map((h) => h.down);
  const loadTone = host.load1 > host.cores ? theme.warning : theme.accent;
  const diskTone = host.diskPct >= 95 ? theme.danger : host.diskPct >= 90 ? theme.warning : theme.success;
  const failed = services.filter((service) => service.state === "failed");
  const loadMax = Math.max(host.cores * 2, ...loadSeries, 1);

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-3 shrink-0">
        <Box className="flex-col">
          <Text color={theme.accent} bold wrap="nowrap">
            {WORDMARK}
          </Text>
          <Box className="flex-row gap-2 items-center">
            <Text color={theme.muted} wrap="truncate-end">
              Live telemetry from this host: real units, real sockets.
            </Text>
            <Badge variant="success">live</Badge>
          </Box>
        </Box>
        <Box className="grow" />
        <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title=" Host " titleColor={theme.subtle}>
          <Box className="flex-row h-1">
            <Text bold color={theme.fg} wrap="nowrap">
              {`● ${host.hostname}`}
            </Text>
          </Box>
          <Text color={theme.subtle} wrap="nowrap">
            {`${host.cores} cores · up ${humanAge(host.uptimeSec)} · ${host.procs} procs`}
          </Text>
          <Text color={theme.subtle} wrap="nowrap">
            {host.platform}
          </Text>
          <Box className="flex-row h-1 gap-1 items-center">
            <Text color={theme.subtle} wrap="nowrap">
              disk
            </Text>
            <Box width={14} className="shrink-0">
              <ProgressBar value={host.diskPct} max={100} width={14} showValue={false} color={diskTone} trackColor={theme.surface} />
            </Box>
            <Text color={diskTone} wrap="nowrap">
              {`${host.diskPct}%`}
            </Text>
          </Box>
        </Box>
      </Box>

      <Box className="flex-row gap-1 shrink-0">
        <MetricCard
          label="Load 1m"
          value={host.load1.toFixed(2)}
          unit={` / ${host.cores}`}
          data={loadSeries}
          color={loadTone}
          min={0}
          max={loadMax}
        />
        <MetricCard
          label="CPU"
          value={`${host.cpuPct.toFixed(1)}%`}
          data={cpuSeries}
          color={host.cpuPct > 85 ? theme.danger : theme.accent}
          min={0}
          max={100}
        />
        <MetricCard
          label="Memory"
          value={`${host.memPct.toFixed(0)}%`}
          unit={` ${Math.round(host.memUsedMiB / 1024)}G/${Math.round(host.memTotalMiB / 1024)}G`}
          data={memSeries}
          color={host.memPct > 90 ? theme.danger : theme.success}
          min={0}
          max={100}
        />
        <MetricCard
          label="Failed"
          value={String(counts.failed)}
          unit={` / ${counts.total} services`}
          data={downSeries}
          color={counts.failed > 0 ? theme.danger : theme.success}
          min={0}
          max={Math.max(4, ...downSeries)}
        />
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" Problems " grow>
          {problems.length === 0 ? (
            <Text color={theme.success}>no problems found</Text>
          ) : (
            problems.map((problem) => (
              <Box key={problem.id} className="flex-row h-1 gap-1">
                <Text
                  bold
                  color={problem.severity === "SEV-1" ? theme.danger : problem.severity === "SEV-2" ? theme.warning : theme.info}
                  width={7}
                  wrap="nowrap"
                >
                  {problem.severity}
                </Text>
                <Text color={theme.fg} wrap="truncate-end">
                  {problem.title}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {problem.scope}
                </Text>
              </Box>
            ))
          )}
          <Box className="grow" />
          <Divider color={theme.border} />
          <Box className="flex-row h-1 gap-2">
            <Text color={theme.subtle} wrap="nowrap">
              {`${counts.running}/${counts.total} running`}
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              {`${counts.systemd} systemd`}
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              {`${counts.docker} docker`}
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              {`${counts.probes} probes`}
            </Text>
            <Box className="grow" />
            <Link href="/fleet" shortcut="2">
              fleet →
            </Link>
          </Box>
        </Panel>

        <Box className="flex-col shrink-0" width={46}>
          <Panel title=" Socket probes " grow>
            {ports.map((port) => (
              <Box key={port.port} className="flex-row h-1 gap-1">
                <Text color={port.ok ? theme.success : theme.danger} width={2} wrap="nowrap">
                  {port.ok ? "●" : "✕"}
                </Text>
                <Text color={theme.fg} width={6} wrap="nowrap">
                  {`:${port.port}`}
                </Text>
                <Text color={theme.subtle} wrap="truncate-end">
                  {port.proc || "process"}
                </Text>
                <Box className="grow" />
                <Text color={port.ok ? theme.muted : theme.danger} wrap="nowrap">
                  {port.latencyMs === null ? "timeout" : `${port.latencyMs.toFixed(1)}ms`}
                </Text>
              </Box>
            ))}
            <Box className="grow" />
            <Divider color={theme.border} />
            <Box className="flex-row h-1">
              <Text color={theme.subtle} wrap="nowrap">
                TCP connect · 250ms budget
              </Text>
              <Box className="grow" />
              <Text color={counts.up === counts.probes ? theme.success : theme.warning} wrap="nowrap">
                {`${counts.up}/${counts.probes}`}
              </Text>
            </Box>
          </Panel>
        </Box>
      </Box>

      <Box className="flex-row gap-4 shrink-0 px-1">
        <Stat label="LOAD 5/15" value={`${host.load5.toFixed(1)} / ${host.load15.toFixed(1)}`} />
        <Stat label="SWAP" value={`${host.swapUsedMiB} MiB`} />
        <Stat label="DISK FREE" value={`${(host.diskTotalGiB - host.diskUsedGiB).toFixed(0)} GiB`} color={diskTone} />
        <Stat label="FAILED" value={String(failed.length)} color={failed.length ? theme.danger : theme.success} />
        <Box className="grow" />
        <Link href="/snapshot" shortcut="4">
          text snapshot →
        </Link>
        <Sparkline
          data={loadSeries.length > 1 ? loadSeries : [host.load1, host.load1]}
          width={18}
          color={loadTone}
          min={0}
          max={loadMax}
        />
      </Box>
    </Box>
  );
}
