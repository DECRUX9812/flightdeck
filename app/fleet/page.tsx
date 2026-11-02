"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge, Box, Table, Text, useInput, useTheme, type Metadata, type TableColumn } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import type { Service } from "../../lib/types";
import { useLive } from "../../lib/useLive";
import { Panel, Stat } from "../../components/ui";

export const metadata: Metadata = { title: "Fleet" };

const STATE_COLOR: Record<Service["state"], string> = {
  running: "success",
  failed: "danger",
  restarting: "warning",
  inactive: "muted",
  unknown: "subtle",
};

const KIND_LABEL: Record<Service["kind"], string> = {
  systemd: "systemd",
  docker: "docker",
  port: "socket",
};

export default function FleetPage(): ReactNode {
  const theme = useTheme();
  const { snapshot } = useLive();
  const router = useRouter();
  const [onlyFailed, setOnlyFailed] = useState(false);

  useInput((event) => {
    if (event.key === "f") setOnlyFailed((value) => !value);
  });

  const services = snapshot?.services ?? [];
  const rows = useMemo(
    () => (onlyFailed ? services.filter((service) => service.state !== "running") : services),
    [services, onlyFailed],
  );

  const columns: ReadonlyArray<TableColumn<Service>> = [
    {
      key: "state",
      header: "STATE",
      width: 12,
      sortable: true,
      value: (row) => row.state,
      render: (row) => (
        <Text color={theme[STATE_COLOR[row.state] as keyof typeof theme] as string} wrap="nowrap">
          {`${row.state === "running" ? "●" : row.state === "failed" ? "✕" : "◐"} ${row.state}`}
        </Text>
      ),
    },
    {
      key: "kind",
      header: "KIND",
      width: 9,
      sortable: true,
      render: (row) => (
        <Text color={theme.subtle} wrap="nowrap">
          {KIND_LABEL[row.kind]}
        </Text>
      ),
    },
    {
      key: "name",
      header: "SERVICE",
      width: 34,
      sortable: true,
      render: (row) => (
        <Text bold color={theme.fg} wrap="truncate-end">
          {row.name}
        </Text>
      ),
    },
    {
      key: "latency",
      header: "LATENCY",
      width: 9,
      align: "right",
      sortable: true,
      value: (row) => row.latencyMs ?? -1,
      render: (row) => (
        <Text color={row.latencyMs == null ? theme.danger : theme.muted} wrap="nowrap">
          {row.kind === "port" ? (row.latencyMs == null ? "timeout" : `${row.latencyMs.toFixed(1)}ms`) : "—"}
        </Text>
      ),
    },
    {
      key: "detail",
      header: "DETAIL",
      sortable: false,
      render: (row) => (
        <Text color={theme.subtle} wrap="truncate-end">
          {row.description || "—"}
        </Text>
      ),
    },
  ];

  const failed = services.filter((service) => service.state === "failed").length;
  const running = services.filter((service) => service.state === "running").length;

  if (!snapshot) {
    return (
      <Box className="grow items-center justify-center">
        <Text color={theme.muted}>reading the machine…</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-3 shrink-0 items-baseline">
        <Text bold color={theme.fg} wrap="nowrap">
          Fleet
        </Text>
        <Badge variant="success">{`${running} running`}</Badge>
        <Badge variant={failed ? "danger" : "outline"}>{`${failed} failed`}</Badge>
        <Text color={theme.subtle} wrap="nowrap">
          {`${snapshot.counts.systemd} systemd · ${snapshot.counts.docker} docker · ${snapshot.counts.probes} sockets`}
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          {onlyFailed ? "showing problems · f to show all" : "↑↓ move · ⏎ open · s sort · f filter"}
        </Text>
      </Box>

      <Panel title={onlyFailed ? " Not running " : " All services "} grow>
        <Table<Service>
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          sortable
          autoFocus
          scrollbar
          columnGap={1}
          emptyText="no services found on this platform"
          onSelect={(row) => router.push(`/fleet/${row.id}`)}
        />
      </Panel>

      <Box className="flex-row gap-4 shrink-0 px-1">
        <Stat label="TOTAL" value={String(snapshot.counts.total)} />
        <Stat label="RUNNING" value={String(running)} color={theme.success} />
        <Stat label="FAILED" value={String(failed)} color={failed ? theme.danger : theme.success} />
        <Stat label="SOCKETS" value={`${snapshot.counts.up}/${snapshot.counts.probes}`} />
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          {`collected ${new Date(snapshot.generatedAt).toLocaleTimeString()} · refreshes every 2s`}
        </Text>
      </Box>
    </Box>
  );
}
