"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Badge, Box, Divider, Text, useTheme, type Metadata } from "@textjs/app";
import Link from "@textjs/app/link";
import { notFound, useParams, useRouter } from "@textjs/app/navigation";
import { humanAge } from "../../../lib/format";
import { useLive } from "../../../lib/useLive";
import { Panel, Stat } from "../../../components/ui";

export function generateMetadata({ params }: { params: Record<string, string | string[]> }): Metadata {
  return { title: String(params.id) };
}


function JournalLine({ line, theme }: { line: string; theme: ReturnType<typeof useTheme> }): ReactNode {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})[^\s]*\s+(.*)$/.exec(line);
  const time = match?.[1]?.slice(11) ?? "";
  const message = match?.[2] ?? line;
  return (
    <Box className="flex-row h-1 gap-1">
      <Text color={theme.subtle} width={9} wrap="nowrap">
        {time}
      </Text>
      <Text color={theme.muted} wrap="truncate-end">
        {message}
      </Text>
    </Box>
  );
}

const STATE_TONE: Record<string, "success" | "danger" | "warning" | "outline"> = {
  running: "success",
  failed: "danger",
  restarting: "warning",
  inactive: "outline",
  unknown: "outline",
};

export default function ServicePage(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { snapshot } = useLive();
  const [journal, setJournal] = useState<string[] | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);

  const service = snapshot?.services.find((entry) => entry.id === id);

  useEffect(() => {
    let cancelled = false;
    setJournal(null);
    setJournalError(null);
    fetch(`/api/journal?id=${encodeURIComponent(id)}&lines=10`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lines: string[]; error?: string }) => {
        if (cancelled) return;
        setJournal(data.lines ?? []);
        if (data.error) setJournalError(data.error);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setJournalError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (snapshot && !service) notFound();
  if (!service) {
    return (
      <Box className="grow items-center justify-center">
        <Text color={theme.muted}>reading the machine…</Text>
      </Box>
    );
  }

  const host = snapshot!.host;

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
        <Badge variant={STATE_TONE[service.state] ?? "outline"}>{service.state}</Badge>
        <Text color={theme.subtle} wrap="nowrap">
          {`${service.kind}${service.scope ? ` · ${service.scope}` : ""}${service.since ? ` · ${service.since}` : ""}`}
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          esc back
        </Text>
      </Box>

      <Text color={theme.muted} wrap="truncate-end">
        {service.description || "no description"}
      </Text>

      <Box className="flex-row gap-4 shrink-0 px-1">
        <Stat label="STATE" value={service.state} color={service.state === "failed" ? theme.danger : theme.success} />
        <Stat label="KIND" value={service.kind} />
        <Stat label="SCOPE" value={service.scope ?? "—"} />
        <Stat
          label="LATENCY"
          value={service.kind === "port" ? (service.latencyMs == null ? "timeout" : `${service.latencyMs.toFixed(1)}ms`) : "—"}
          color={service.latencyMs == null ? theme.danger : theme.fg}
        />
        <Stat label="UNIT" value={service.name.replace(/\.service$/, "")} />
        <Box className="grow" />
        <Stat label="HOST" value={`${host.hostname} · up ${humanAge(host.uptimeSec)}`} />
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" Journal " grow>
          {journal === null ? (
            <Text color={theme.muted}>reading journal…</Text>
          ) : journal.length === 0 ? (
            <Text color={theme.subtle}>{journalError ?? "no journal entries for this unit"}</Text>
          ) : (
            journal.map((line, index) => <JournalLine key={`${index}-${line.slice(0, 12)}`} line={line} theme={theme} />)
          )}
        </Panel>

        <Box className="flex-col shrink-0" width={40}>
          <Panel title=" Host right now " grow>
            <Text color={theme.subtle} wrap="nowrap">
              {`load  ${host.load1.toFixed(2)} / ${host.cores} cores`}
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              {`cpu   ${host.cpuPct.toFixed(1)}%`}
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              {`mem   ${host.memPct.toFixed(1)}% of ${Math.round(host.memTotalMiB / 1024)}G`}
            </Text>
            <Text color={host.diskPct >= 90 ? theme.warning : theme.subtle} wrap="nowrap">
              {`disk  ${host.diskPct}% used`}
            </Text>
            <Divider color={theme.border} />
            <Text color={theme.subtle} wrap="nowrap">
              {`${snapshot!.counts.failed} failed · ${snapshot!.counts.running} running`}
            </Text>
            <Box className="grow" />
            <Text color={theme.subtle} wrap="truncate-end">
              {new Date(snapshot!.generatedAt).toLocaleTimeString()}
            </Text>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
