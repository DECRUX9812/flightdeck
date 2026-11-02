"use client";

import type { ReactNode } from "react";
import {
  Badge,
  Box,
  Divider,
  Gradient,
  LineChart,
  ProgressBar,
  Sparkline,
  Text,
  renderAsciiFont,
  useTheme,
  type Metadata,
} from "@textjs/app";
import Link from "@textjs/app/link";
import {
  DEPLOYS,
  DEPLOY_COLOR,
  INCIDENTS,
  INCIDENT_COLOR,
  REGIONS,
  SEVERITY_COLOR,
  activityFeed,
  bounds,
  compact,
  deployProgress,
  fleetTotals,
  hash,
  liveService,
  ms,
  pct,
  series,
  SERVICES,
} from "../lib/data";
import { useClockSeconds, useTick } from "../lib/live";
import { MetricCard, Panel } from "../components/ui";

export const metadata: Metadata = { title: "Overview" };

/** Pixel wordmark, gradient-tinted per cell. */
const WORDMARK = renderAsciiFont("FLIGHTDECK", "compact", 2).join("\n");

function Hero(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-row gap-3 shrink-0">
      <Box className="flex-col">
        <Gradient colors="geist" bold>
          {WORDMARK}
        </Gradient>
        <Box className="flex-row gap-2">
          <Text color={theme.muted} wrap="nowrap">
            Mission control for production, rendered in console.log.
          </Text>
          <Badge variant="accent">v1.0</Badge>
        </Box>
      </Box>
      <Box className="grow" />
      <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title=" Status " titleColor={theme.subtle}>
        <Box className="flex-row h-1">
          <Text bold color={theme.success} wrap="nowrap">
            ● OPERATIONAL
          </Text>
        </Box>
        <Text color={theme.subtle} wrap="nowrap">
          12 services · 5 regions · 1,284 checks/min
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          on-call @dan · next handoff 16h
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          deploy freeze: off
        </Text>
      </Box>
    </Box>
  );
}

function Overview(): ReactNode {
  const theme = useTheme();
  const tick = useTick();
  const clock = useClockSeconds();
  const totals = fleetTotals(tick);
  const deploys = DEPLOYS.slice(0, 4);
  const incidents = INCIDENTS;
  const activity = activityFeed(tick, 2, clock);

  const rps = series(hash("rps"), tick, 30, { base: totalRps(tick), amp: 2200, min: 0 });
  const p95 = series(hash("p95"), tick, 30, { base: 900, amp: 160, min: 100 });
  const err = series(hash("err"), tick, 30, { base: totals.err * 100, amp: 0.09, min: 0 });
  const budget = series(hash("budget"), tick, 30, { base: totals.budget * 100, amp: 2.4, min: 0, max: 100 });
  const rpsRange = bounds(rps);
  const p95Range = bounds(p95);
  const errRange = bounds(err);
  const budgetRange = bounds(budget);

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Hero />

      <Box className="flex-row gap-1 shrink-0">
        <MetricCard
          label="Requests"
          value={compact(totals.rps)}
          unit=" req/s"
          delta={0.031}
          data={rps}
          color={theme.accent}
          min={rpsRange.min}
          max={rpsRange.max}
        />
        <MetricCard
          label="p95 latency"
          value={ms(totals.p95)}
          delta={0.128}
          data={p95}
          color={totals.p95 > 500 ? theme.warning : theme.fg}
          min={p95Range.min}
          max={p95Range.max}
        />
        <MetricCard
          label="Error rate"
          value={pct(totals.err, 2)}
          delta={0.18}
          data={err}
          color={theme.danger}
          min={errRange.min}
          max={errRange.max}
        />
        <MetricCard
          label="Error budget"
          value={pct(totals.budget, 0)}
          delta={-0.06}
          data={budget}
          color={theme.success}
          min={budgetRange.min}
          max={budgetRange.max}
        />
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" Deploy queue " grow>
          {deploys.map((deploy) => {
            const progress = deployProgress(deploy, tick);
            return (
              <Box key={deploy.id} className="flex-row h-1 gap-1 items-center">
                <Text color={DEPLOY_COLOR[deploy.state]} width={2} wrap="nowrap">
                  {deploy.state === "building" ? "◌" : deploy.state === "ready" ? "●" : deploy.state === "failed" ? "✕" : "○"}
                </Text>
                <Text color={theme.fg} width={13} wrap="nowrap">
                  {deploy.service}
                </Text>
                <Box width={16} className="shrink-0">
                  <ProgressBar
                    value={progress}
                    width={14}
                    color={DEPLOY_COLOR[deploy.state]}
                    trackColor={theme.surface}
                    showValue={false}
                  />
                </Box>
                <Text color={theme.muted} width={5} wrap="nowrap" align="right">
                  {`${Math.round(progress * 100)}%`}
                </Text>
                <Text color={theme.subtle} width={7} wrap="nowrap">
                  {deploy.actor}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {deploy.age}
                </Text>
              </Box>
            );
          })}
          <Box className="grow" />
          <Divider title=" ingress · rps " color={theme.border} titleColor={theme.subtle} />
          <Box className="shrink-0" height={4}>
            <LineChart data={rps.slice(-26)} height={4} axis={false} color={theme.accent} width={64} />
          </Box>
          <Divider title=" activity " color={theme.border} titleColor={theme.subtle} />
          {activity.map((entry) => (
            <Box key={entry.time} className="flex-row h-1 gap-2">
              <Text color={theme.subtle} wrap="nowrap">
                {entry.time}
              </Text>
              <Text color={theme.muted} wrap="truncate-end">
                {entry.text}
              </Text>
            </Box>
          ))}
        </Panel>

        <Box className="flex-col shrink-0" width={46}>
          <Panel title=" Open incidents " grow>
            {incidents.map((incident) => (
              <Box key={incident.id} className="flex-col">
                <Box className="flex-row h-1 gap-1">
                  <Text bold color={SEVERITY_COLOR[incident.severity]} wrap="nowrap">
                    {incident.severity}
                  </Text>
                  <Text color={theme.fg} wrap="truncate-end">
                    {incident.title}
                  </Text>
                  <Box className="grow" />
                  <Text color={theme.subtle} wrap="nowrap">
                    {incident.opened}
                  </Text>
                </Box>
                <Box className="flex-row h-1 gap-1">
                  <Text color={theme.subtle} width={9} wrap="nowrap">
                    {incident.id}
                  </Text>
                  <Text color={INCIDENT_COLOR[incident.state]} wrap="nowrap">
                    {incident.state}
                  </Text>
                </Box>
              </Box>
            ))}
            <Divider title=" burn " color={theme.border} titleColor={theme.subtle} />
            <Box className="flex-row h-1 gap-1">
              <Text color={theme.subtle} width={14} wrap="nowrap">
                error budget
              </Text>
              <Text color={theme.warning} wrap="nowrap">
                {pct(totals.budget, 0)}
              </Text>
            </Box>
            <Box className="flex-row h-1 gap-1">
              <Text color={theme.subtle} width={14} wrap="nowrap">
                burn rate
              </Text>
              <Text color={theme.danger} wrap="nowrap">
                1.4×
              </Text>
              <Box className="grow" />
              <Text color={theme.subtle} wrap="nowrap">
                page in 4m
              </Text>
            </Box>
            <Box className="grow" />
            <Divider title=" on call " color={theme.border} titleColor={theme.subtle} />
            <Box className="flex-row h-1 gap-1">
              <Text color={theme.subtle} width={10} wrap="nowrap">
                primary
              </Text>
              <Text color={theme.fg} wrap="nowrap">
                @dan
              </Text>
              <Box className="grow" />
              <Text color={theme.subtle} wrap="nowrap">
                16h left
              </Text>
            </Box>
            <Box className="flex-row h-1 gap-1">
              <Text color={theme.subtle} width={10} wrap="nowrap">
                secondary
              </Text>
              <Text color={theme.muted} wrap="nowrap">
                @mira
              </Text>
              <Box className="grow" />
              <Text color={theme.subtle} wrap="nowrap">
                16h left
              </Text>
            </Box>
            <Box className="h-1" />
            <Link href="/incidents" shortcut="3">
              View timeline →
            </Link>
          </Panel>
        </Box>
      </Box>

      <Box className="flex-row gap-2 shrink-0">
        {REGIONS.map((region) => (
          <RegionCell key={region.id} tick={tick} region={region} />
        ))}
      </Box>
    </Box>
  );
}

function RegionCell({ region, tick }: { region: (typeof REGIONS)[number]; tick: number }): ReactNode {
  const theme = useTheme();
  const data = series(hash(region.id), tick, 8, { base: region.availability * 100, amp: 0.09 });
  const range = bounds(data);
  const tone = region.status === "healthy" ? theme.success : theme.warning;
  return (
    <Box className="flex-row gap-1 items-center">
      <Text color={theme.subtle} wrap="nowrap">
        {region.id}
      </Text>
      <Sparkline data={data} width={8} min={range.min} max={range.max} color={tone} />
      <Text color={region.status === "healthy" ? theme.muted : theme.warning} wrap="nowrap">
        {pct(region.availability, 3)}
      </Text>
    </Box>
  );
}


function totalRps(tick: number): number {
  return SERVICES.reduce((sum, s) => sum + liveService(s, tick).liveRps, 0);
}

export default function OverviewPage(): ReactNode {
  return <Overview />;
}
