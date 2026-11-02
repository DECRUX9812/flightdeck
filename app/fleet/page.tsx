"use client";

import type { ReactNode } from "react";
import {
  Badge,
  BarChart,
  Box,
  ProgressBar,
  Sparkline,
  Table,
  Text,
  ThemeProvider,
  useTheme,
  type Metadata,
  type TableColumn,
} from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import {
  DEPLOYS,
  DEPLOY_COLOR,
  SERVICES,
  STATUS_COLOR,
  STATUS_MARK,
  bounds,
  compact,
  hash,
  liveService,
  ms,
  pct,
  series,
  type LiveService,
} from "../../lib/data";
import { useTick } from "../../lib/live";
import { Panel, Stat } from "../../components/ui";

export const metadata: Metadata = { title: "Fleet" };

export default function FleetPage(): ReactNode {
  const theme = useTheme();
  const tick = useTick();
  const router = useRouter();
  const rows = SERVICES.map((service) => liveService(service, tick));
  const healthy = rows.filter((row) => row.status === "healthy").length;
  const unhealthy = rows.filter((row) => row.status === "degraded" || row.status === "down").length;

  const columns: ReadonlyArray<TableColumn<LiveService>> = [
    {
      key: "status",
      header: "STATUS",
      width: 12,
      sortable: true,
      value: (row) => row.status,
      render: (row) => (
        <Text color={STATUS_COLOR[row.status]} wrap="nowrap">
          {`${STATUS_MARK[row.status]} ${row.status}`}
        </Text>
      ),
    },
    {
      key: "name",
      header: "SERVICE",
      width: 14,
      sortable: true,
      render: (row) => (
        <Text bold color={theme.fg} wrap="nowrap">
          {row.name}
        </Text>
      ),
    },
    {
      key: "p95",
      header: "P95",
      width: 7,
      align: "right",
      sortable: true,
      value: (row) => row.liveP95,
      render: (row) => (
        <Text color={row.liveP95 > 400 ? theme.warning : theme.fg} wrap="nowrap">
          {ms(row.liveP95)}
        </Text>
      ),
    },
    {
      key: "rps",
      header: "RPS",
      width: 8,
      align: "right",
      sortable: true,
      value: (row) => row.liveRps,
      render: (row) => (
        <Text color={theme.muted} wrap="nowrap">
          {compact(row.liveRps)}
        </Text>
      ),
    },
    {
      key: "trend",
      header: "LAST 3M",
      width: 13,
      sortable: false,
      render: (row) => {
        const data = series(hash(row.id), tick, 13, { base: row.liveP95, amp: Math.max(6, row.liveP95 * 0.2), min: 0 });
        const range = bounds(data);
        return <Sparkline data={data} width={13} min={range.min} max={range.max} color={STATUS_COLOR[row.status]} />;
      },
    },
    {
      key: "err",
      header: "ERRORS",
      width: 8,
      align: "right",
      sortable: true,
      value: (row) => row.liveErr,
      render: (row) => (
        <Text color={row.liveErr > 0.001 ? theme.danger : theme.subtle} wrap="nowrap">
          {row.liveErr < 0.0001 ? "<0.01%" : pct(row.liveErr, 2)}
        </Text>
      ),
    },
    {
      key: "budget",
      header: "BUDGET",
      width: 12,
      sortable: true,
      value: (row) => row.liveBudget,
      render: (row) => (
        <Box className="flex-row gap-1 items-center">
          <Box width={6} className="shrink-0">
            <ProgressBar
              value={row.liveBudget}
              width={6}
              showValue={false}
              color={row.liveBudget < 0.3 ? theme.danger : row.liveBudget < 0.6 ? theme.warning : theme.success}
              trackColor={theme.surface}
            />
          </Box>
          <Text color={theme.subtle} wrap="nowrap">
            {pct(row.liveBudget, 0)}
          </Text>
        </Box>
      ),
    },
    {
      key: "region",
      header: "REGION",
      width: 7,
      sortable: true,
      render: (row) => (
        <Text color={theme.subtle} wrap="nowrap">
          {row.region}
        </Text>
      ),
    },
    {
      key: "version",
      header: "VERSION",
      width: 9,
      sortable: true,
      render: (row) => (
        <Text color={theme.muted} wrap="nowrap">
          {row.version}
        </Text>
      ),
    },
    {
      key: "owner",
      header: "OWNER",
      width: 14,
      sortable: true,
      render: (row) => (
        <Text color={theme.subtle} wrap="nowrap">
          {row.owner}
        </Text>
      ),
    },
  ];

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-3 shrink-0 items-baseline">
        <Text bold color={theme.fg} wrap="nowrap">
          Fleet
        </Text>
        <Badge variant="success">{`${healthy} healthy`}</Badge>
        <Badge variant={unhealthy > 0 ? "warning" : "outline"}>{`${unhealthy} at risk`}</Badge>
        <Text color={theme.subtle} wrap="nowrap">
          {`${SERVICES.length} services · 5 regions · 1,284 checks/min`}
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          ↑↓ move · ⏎ open · s sort
        </Text>
      </Box>

      <Panel title=" Services " height={17}>
        {/* A softer selection tint: the default is a full-strength blue block. */}
        <ThemeProvider theme={{ ...theme, id: `${theme.id}-table`, selection: theme.surface }}>
        <Table<LiveService>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          sortable
          autoFocus
          scrollbar
          height={12}
          onSelect={(row) => router.push(`/fleet/${row.id}`)}
          columnGap={1}
        />
        </ThemeProvider>
      </Panel>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" p95 by service " grow>
          <BarChart
            data={[...rows]
              .sort((a, b) => b.liveP95 - a.liveP95)
              .slice(0, 5)
              .map((row) => ({
                label: row.name,
                value: row.liveP95,
                color: row.status === "healthy" ? theme.accent : STATUS_COLOR[row.status],
              }))}
            formatValue={(value) => ms(value)}
            color={theme.accent}
          />
          <Box className="grow" />
          <Text color={theme.subtle} wrap="truncate-end">
            SLO 300ms · worst first
          </Text>
        </Panel>

        <Box className="flex-col shrink-0" width={52}>
          <Panel title=" Recent deploys " grow>
            {DEPLOYS.map((deploy) => (
              <Box key={deploy.id} className="flex-row h-1 gap-1">
                <Text color={DEPLOY_COLOR[deploy.state]} width={9} wrap="nowrap">
                  {deploy.state}
                </Text>
                <Text color={theme.fg} width={11} wrap="nowrap">
                  {deploy.service}
                </Text>
                <Text color={theme.subtle} width={7} wrap="nowrap">
                  {deploy.actor}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {deploy.age}
                </Text>
              </Box>
            ))}
          </Panel>
        </Box>
      </Box>

      <Box className="flex-row gap-4 shrink-0 px-1">
        <Stat label="REQUEST RATE" value={`${compact(rows.reduce((sum, row) => sum + row.liveRps, 0))} req/s`} />
        <Stat label="WORST P95" value={ms(Math.max(...rows.map((row) => row.liveP95)))} color={theme.warning} />
        <Stat label="SERVICES DOWN" value={String(rows.filter((row) => row.status === "down").length)} color={theme.danger} />
        <Stat label="DEPLOYS TODAY" value="27" />
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          Metrics window: 3m · scrape every 5s
        </Text>
      </Box>
    </Box>
  );
}
