"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box, Divider, Text, useTheme, type Metadata } from "@textjs/app";
import { Panel } from "../../components/ui";

export const metadata: Metadata = { title: "Snapshot" };

const CI = [
  "# fail the build when anything is down",
  'curl -fsS "$APP/api/live?format=text" | tee flightdeck.txt',
  'grep -q "^no problems found" flightdeck.txt || exit 1',
];

const CRON = [
  "# post the board to Slack every 15 minutes",
  '*/15 * * * * curl -s "$APP/api/live?format=text" \\',
  "  | jq -Rs '{text: .}' \\",
  "  | curl -s -X POST -H 'content-type: application/json' -d @- \"$SLACK\"",
];

function Lines({ lines, color }: { lines: string[]; color: string }): ReactNode {
  return (
    <>
      {lines.map((line, index) => (
        <Text key={`${index}-${line.slice(0, 16)}`} color={color} wrap="truncate-end">
          {line}
        </Text>
      ))}
    </>
  );
}

export default function SnapshotPage(): ReactNode {
  const theme = useTheme();
  const [text, setText] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    fetch("/api/live?format=text", { cache: "no-store" })
      .then((response) => response.text())
      .then((body) => {
        setText(body.trimEnd().split("\n"));
        setFailed(false);
      })
      .catch((cause: unknown) => {
        setText([cause instanceof Error ? cause.message : String(cause)]);
        setFailed(true);
      });
  }, []);

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-2 shrink-0 items-baseline">
        <Text bold color={theme.fg} wrap="nowrap">
          Text snapshot
        </Text>
        <Text color={theme.muted} wrap="nowrap">
          the same board as plain text — for CI logs, cron, Slack or a ticket.
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          GET /api/live?format=text
        </Text>
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" live output " grow>
          {failed ? (
            <Text color={theme.danger}>could not fetch the snapshot</Text>
          ) : text.length === 0 ? (
            <Text color={theme.muted}>rendering…</Text>
          ) : (
            <Lines lines={text} color={theme.fg} />
          )}
        </Panel>

        <Box className="flex-col shrink-0" width={58}>
          <Panel title=" Use it " grow>
            <Text color={theme.subtle} wrap="truncate-end" allowLink={false}>
              {`$ curl ${origin}/api/live?format=text`}
            </Text>
            <Box className="py-1">
              <Divider title=" in CI " color={theme.border} titleColor={theme.subtle} />
            </Box>
            <Lines lines={CI} color={theme.muted} />
            <Box className="py-1">
              <Divider title=" on a schedule " color={theme.border} titleColor={theme.subtle} />
            </Box>
            <Lines lines={CRON} color={theme.muted} />
            <Box className="grow" />
            <Divider color={theme.border} />
            <Text color={theme.subtle} wrap="truncate-end">
              JSON lives at /api/live · set FLIGHTDECK_TOKEN to require ?token=
            </Text>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
