"use client";

import type { ReactNode } from "react";
import {
  BarChart,
  Box,
  Divider,
  LineChart,
  ProgressBar,
  Text,
  useInput,
  useTheme,
  useToast,
  type Metadata,
} from "@textjs/app";
import Link from "@textjs/app/link";
import { notFound, useParams, useRouter } from "@textjs/app/navigation";
import {
  SERVICES,
  STATUS_COLOR,
  STATUS_MARK,
  compact,
  hash,
  liveService,
  ms,
  pct,
  series,
} from "../../../lib/data";
import { useTick } from "../../../lib/live";
import { Field, Panel, Stat } from "../../../components/ui";

export function generateMetadata({ params }: { params: Record<string, string | string[]> }): Metadata {
  return { title: String(params.id) };
}

const ENDPOINTS = [
  "GET  /v1/items",
  "POST /v1/checkout",
  "GET  /v1/search",
  "POST /v1/session",
  "GET  /healthz",
] as const;

export default function ServicePage(): ReactNode {
  const theme = useTheme();
  const tick = useTick();
  const router = useRouter();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const base = SERVICES.find((service) => service.id === id);
  if (!base) notFound();
  const service = liveService(base, tick);
  const seed = hash(service.id);

  useInput((event) => {
    if (event.key === "escape") router.push("/fleet");
    if (event.key === "d") toast.success(`Deploy queued`, { description: `${service.name} ${service.version} → prod` });
  });

  const latency = series(seed, tick, 48, { base: service.liveP95, amp: Math.max(8, service.liveP95 * 0.22), min: 1 });
  const throughput = series(seed + 0.2, tick, 48, { base: service.liveRps, amp: service.liveRps * 0.08, min: 0 });

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-2 shrink-0 items-baseline">
        <Link href="/fleet" className="text-subtle no-underline">
          ← fleet
        </Link>
        <Text color={theme.border}>/</Text>
        <Text bold color={theme.fg} wrap="nowrap">
          {service.name}
        </Text>
        <Text color={STATUS_COLOR[service.status]} wrap="nowrap">
          {`${STATUS_MARK[service.status]} ${service.status}`}
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {`${service.version} · ${service.region} · ${service.instances} instances · ${service.owner}`}
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          esc back · d deploy
        </Text>
      </Box>

      <Text color={theme.muted} wrap="truncate-end">
        {service.summary}
      </Text>

      <Box className="flex-row gap-4 shrink-0 px-1">
        <Stat label="P95" value={ms(service.liveP95)} color={service.liveP95 > 400 ? theme.warning : theme.fg} />
        <Stat label="REQ/S" value={compact(service.liveRps)} />
        <Stat label="ERRORS" value={pct(service.liveErr, 3)} color={service.liveErr > 0.001 ? theme.danger : theme.success} />
        <Stat
          label="BUDGET"
          value={pct(service.liveBudget, 0)}
          color={service.liveBudget < 0.3 ? theme.danger : service.liveBudget < 0.6 ? theme.warning : theme.success}
        />
        <Stat label="SATURATION" value={pct(Math.min(0.99, 0.42 + (service.liveRps / Math.max(1, service.rps)) * 0.3), 0)} />
        <Stat label="AGE" value="38d" />
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" p95 latency · last 15m " grow>
          <Box className="grow min-h-0">
            <LineChart
              data={latency}
              height={9}
              axis
              formatValue={(value) => ms(value)}
              color={theme.accent}
            />
          </Box>
          <Box className="flex-row gap-3 shrink-0">
            <Text color={theme.subtle} wrap="nowrap">{`min ${ms(Math.min(...latency))}`}</Text>
            <Text color={theme.subtle} wrap="nowrap">{`max ${ms(Math.max(...latency))}`}</Text>
            <Text color={theme.subtle} wrap="nowrap">{`rps ${compact(throughput[throughput.length - 1] ?? 0)}`}</Text>
            <Box className="grow" />
            <Text color={theme.subtle} wrap="nowrap">
              SLO p95 ≤ 300ms
            </Text>
          </Box>
        </Panel>

        <Box className="flex-col shrink-0" width={38}>
          <Panel title=" Top routes " grow>
            <BarChart
              data={ENDPOINTS.map((endpoint, index) => ({
                label: endpoint,
                value: Math.round(service.liveP95 * (0.4 + index * 0.22) * (1 + 0.1 * Math.sin(tick / 4 + index))),
                color: index === 0 ? theme.warning : theme.accent,
              }))}
              formatValue={(value) => ms(value)}
              color={theme.accent}
            />
            <Box className="grow" />
            <Divider title=" status " color={theme.border} titleColor={theme.subtle} />
            {[
              { code: "2xx", share: 0.989, color: theme.success },
              { code: "4xx", share: 0.007, color: theme.warning },
              { code: "5xx", share: 0.004, color: theme.danger },
            ].map((row) => (
              <Box key={row.code} className="flex-row h-1 gap-1 items-center">
                <Text color={row.color} width={4} wrap="nowrap">
                  {row.code}
                </Text>
                <Box width={20} className="shrink-0">
                  <ProgressBar
                    value={row.share}
                    max={1}
                    width={20}
                    showValue={false}
                    color={row.color}
                    trackColor={theme.surface}
                  />
                </Box>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {pct(row.share, 1)}
                </Text>
              </Box>
            ))}
          </Panel>
        </Box>
      </Box>

      <Box className="flex-row gap-1 shrink-0" height={9}>
        <Panel title=" Instances " grow>
          {Array.from({ length: 4 }, (_, index) => {
            const load = 0.32 + 0.16 * Math.abs(Math.sin(seed * 9 + tick / 5 + index));
            return (
              <Box key={index} className="flex-row h-1 gap-2 items-center">
                <Text color={theme.success} wrap="nowrap">
                  ●
                </Text>
                <Text color={theme.muted} width={22} wrap="nowrap">
                  {`${service.name}-${(seed * 8917 + index * 31).toFixed(0).slice(0, 4)}`}
                </Text>
                <Text color={theme.subtle} width={8} wrap="nowrap">
                  {service.region}
                </Text>
                <Box width={12} className="shrink-0">
                  <ProgressBar
                    value={load}
                    width={12}
                    showValue={false}
                    color={load > 0.75 ? theme.warning : theme.success}
                    trackColor={theme.surface}
                  />
                </Box>
                <Text color={theme.subtle} width={5} wrap="nowrap">
                  {pct(load, 0)}
                </Text>
                <Text color={theme.subtle} wrap="nowrap">
                  {`${ms(service.liveP95 * (0.8 + index * 0.1))} · ${(service.instances * 0.5).toFixed(1)} GiB`}
                </Text>
              </Box>
            );
          })}
        </Panel>

        <Box className="flex-col shrink-0" width={44}>
          <Panel title=" Active alerts " grow>
            {[
              { name: "gateway-5xx-burn", severity: "SEV-2", state: "firing", age: "14m" },
              { name: "gateway-p99-high", severity: "warn", state: "firing", age: "6m" },
              { name: "gateway-restarts", severity: "info", state: "resolved", age: "2h" },
            ].map((alert) => (
              <Box key={alert.name} className="flex-row h-1 gap-1">
                <Text
                  color={alert.severity === "SEV-2" ? theme.danger : alert.severity === "warn" ? theme.warning : theme.subtle}
                  width={6}
                  wrap="nowrap"
                >
                  {alert.severity}
                </Text>
                <Text color={alert.state === "firing" ? theme.fg : theme.subtle} wrap="truncate-end">
                  {alert.name}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {alert.age}
                </Text>
              </Box>
            ))}
            <Box className="grow" />
            <Divider color={theme.border} />
            <Field label="SLO">
              <Text color={theme.muted} wrap="nowrap">
                99.95% · 43m left
              </Text>
            </Field>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
