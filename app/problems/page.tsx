"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Badge, Box, Divider, List, SplitPane, Text, useTheme, type Metadata } from "@textjs/app";
import type { Problem } from "../../lib/types";
import { useLive } from "../../lib/useLive";
import { Panel, Stat } from "../../components/ui";

export const metadata: Metadata = { title: "Problems" };


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

const TONE: Record<Problem["severity"], "danger" | "warning" | "info"> = {
  "SEV-1": "danger",
  "SEV-2": "warning",
  "SEV-3": "info",
};

export default function IncidentsPage(): ReactNode {
  const theme = useTheme();
  const { snapshot } = useLive();
  const [selected, setSelected] = useState(0);
  const [journal, setJournal] = useState<string[] | null>(null);

  const problems = snapshot?.problems ?? [];
  const problem = problems[Math.min(selected, Math.max(0, problems.length - 1))];

  useEffect(() => {
    if (!problem) return;
    setJournal(null);
    fetch(`/api/journal?id=${encodeURIComponent(problem.id)}&lines=6`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lines: string[] }) => setJournal(data.lines ?? []))
      .catch(() => setJournal([]));
  }, [problem?.id]);

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
          Problems
        </Text>
        <Badge variant={problems.length ? "warning" : "success"}>
          {problems.length ? `${problems.length} open` : "all clear"}
        </Badge>
        <Text color={theme.subtle} wrap="nowrap">
          failed units · unhealthy containers · dead sockets · disk pressure
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          ↑↓ select
        </Text>
      </Box>

      <SplitPane direction="row" defaultSize={0.44} resizable minSize={30} className="grow min-h-0">
        <Panel title=" Queue " grow>
          <List<Problem>
            items={problems}
            autoFocus
            height={Math.max(problems.length, 3)}
            highlightedIndex={selected}
            onHighlight={(index) => setSelected(index)}
            onSelect={(item) => setSelected(problems.indexOf(item))}
            getKey={(item) => item.id}
            emptyText="no problems found"
            renderItem={(item, state) => (
              <Box className="flex-row h-1 gap-1">
                <Text color={TONE[item.severity]} width={7} wrap="nowrap">
                  {item.severity}
                </Text>
                <Text bold={state.highlighted} color={theme.fg} wrap="truncate-end">
                  {item.title}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {item.scope}
                </Text>
              </Box>
            )}
          />
          <Box className="grow" />
          <Divider color={theme.border} />
          <Box className="flex-row h-1 gap-3">
            <Text color={theme.subtle} wrap="nowrap">{`${snapshot.counts.failed} failed units`}</Text>
            <Text color={theme.subtle} wrap="nowrap">{`${snapshot.counts.up}/${snapshot.counts.probes} sockets`}</Text>
          </Box>
        </Panel>

        <Panel title={problem ? ` ${problem.severity} · ${problem.scope} ` : " nothing selected "} grow>
          {problem ? (
            <>
              <Text bold color={theme.fg} wrap="truncate-end">
                {problem.title}
              </Text>
              <Text color={theme.muted} wrap="truncate-end">
                {problem.detail}
              </Text>
              <Text color={theme.subtle} wrap="truncate-end">
                {`scope ${problem.scope} · ${problem.id}`}
              </Text>

              <Box className="py-1">
                <Divider title=" journal " color={theme.border} titleColor={theme.subtle} />
              </Box>

              {journal === null ? (
                <Text color={theme.muted}>reading…</Text>
              ) : journal.length === 0 ? (
                <Text color={theme.subtle}>no journal entries for this unit</Text>
              ) : (
                journal.map((line, index) => <JournalLine key={`${index}-${line.slice(0, 10)}`} line={line} theme={theme} />)
              )}

              <Box className="grow" />
              <Divider color={theme.border} />
              <Box className="flex-row gap-3">
                <Stat label="KIND" value={problem.id.split("-")[0] ?? "—"} />
                <Stat label="STATUS" value="open" color={TONE[problem.severity]} />
                <Stat label="SINCE" value={problem.since} />
              </Box>
              <Text color={theme.subtle} wrap="truncate-end">
                next: inspect the unit with `systemctl status` or open it in the fleet table
              </Text>
            </>
          ) : (
            <Text color={theme.success}>nothing to show</Text>
          )}
        </Panel>
      </SplitPane>
    </Box>
  );
}
