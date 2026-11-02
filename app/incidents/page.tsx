"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Badge,
  Box,
  Divider,
  List,
  Sparkline,
  SplitPane,
  Text,
  useInput,
  useTheme,
  useToast,
  type Metadata,
  type TextTheme,
} from "@textjs/app";
import {
  INCIDENTS,
  SEVERITY_COLOR,
  bounds,
  compact,
  hash,
  ms,
  pct,
  series,
  type Incident,
  type IncidentEvent,
} from "../../lib/data";
import { useTick } from "../../lib/live";
import { Panel, Stat } from "../../components/ui";

export const metadata: Metadata = { title: "Incidents" };

const EVENT_MARK: Record<IncidentEvent["kind"], string> = {
  detected: "◆",
  paged: "▲",
  ack: "●",
  note: "│",
  resolved: "✔",
};

function eventColor(theme: TextTheme, kind: IncidentEvent["kind"]): string {
  switch (kind) {
    case "detected":
      return theme.danger;
    case "paged":
      return theme.warning;
    case "ack":
      return theme.info;
    case "resolved":
      return theme.success;
    default:
      return theme.subtle;
  }
}

function elapsed(tick: number, minutes: number): string {
  const total = minutes * 60 + tick;
  return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
}

function Timeline({ incident }: { incident: Incident }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col">
      {incident.timeline.map((event, index) => (
        <Box key={`${event.at}-${index}`} className="flex-row gap-1 h-1">
          <Text color={theme.subtle} width={6} align="right" wrap="nowrap">
            {event.at}
          </Text>
          <Text color={eventColor(theme, event.kind)} wrap="nowrap">
            {EVENT_MARK[event.kind]}
          </Text>
          <Text color={event.kind === "resolved" ? theme.success : theme.muted} wrap="truncate-end">
            {event.text}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export default function IncidentsPage(): ReactNode {
  const theme = useTheme();
  const tick = useTick();
  const toast = useToast();
  const [selected, setSelected] = useState(0);
  const incident = INCIDENTS[selected] ?? INCIDENTS[0];

  useInput((event) => {
    if (event.key === "a") toast.success("Acknowledged", { description: `${incident?.id} · you are IC` });
    if (event.key === "p") toast.warning("Paged secondary on-call", { description: "@oncall-commerce" });
    if (event.key === "r") toast.success("Resolution drafted", { description: `${incident?.id} · postmortem scheduled` });
  });

  const open = INCIDENTS.filter((item) => item.state !== "resolved").length;

  if (!incident) return null;

  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-3 shrink-0 items-baseline">
        <Text bold color={theme.fg} wrap="nowrap">
          Incidents
        </Text>
        <Badge variant={open > 0 ? "warning" : "success"}>{`${open} open`}</Badge>
        <Text color={theme.subtle} wrap="nowrap">
          30-day MTTR 41m · paging health nominal
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          ↑↓ select · a ack · p page · r resolve
        </Text>
      </Box>

      <SplitPane direction="row" defaultSize={0.42} resizable minSize={28} className="grow min-h-0">
        <Panel title=" Queue " grow>
          <List<Incident>
            items={INCIDENTS}
            height={INCIDENTS.length}
            autoFocus
            highlightedIndex={selected}
            onHighlight={(index) => setSelected(index)}
            onSelect={(item) => setSelected(INCIDENTS.indexOf(item))}
            getKey={(item) => item.id}
            renderItem={(item, state) => (
              <Box className="flex-row h-1 gap-1">
                <Text color={SEVERITY_COLOR[item.severity]} width={6} wrap="nowrap">
                  {item.severity}
                </Text>
                <Text bold={state.highlighted} color={item.state === "resolved" ? theme.subtle : theme.fg} wrap="truncate-end">
                  {item.title}
                </Text>
                <Box className="grow" />
                <Text color={theme.subtle} wrap="nowrap">
                  {item.state === "resolved" ? "✔" : item.opened}
                </Text>
              </Box>
            )}
          />
          <Divider title=" runbook " color={theme.border} titleColor={theme.subtle} />
          {[
            "Confirm 5xx rate on the gateway dashboard",
            "Correlate onset with the last deploy",
            "Roll back 10% of hosts, watch burn",
            "If burn > 2×, roll back 100%",
            "Declare mitigated, schedule postmortem",
          ].map((step, index) => (
            <Box key={step} className="flex-row h-1 gap-1">
              <Text color={theme.subtle} width={3} wrap="nowrap">
                {`${index + 1}.`}
              </Text>
              <Text color={theme.muted} wrap="truncate-end">
                {step}
              </Text>
            </Box>
          ))}
          <Box className="grow" />
          <Divider title=" paging policy " color={theme.border} titleColor={theme.subtle} />
          <Box className="flex-row h-1 gap-1">
            <Text color={theme.danger} width={6} wrap="nowrap">
              SEV-1
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              page IC + VP · 1m
            </Text>
          </Box>
          <Box className="flex-row h-1 gap-1">
            <Text color={theme.warning} width={6} wrap="nowrap">
              SEV-2
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              page owning team · 5m
            </Text>
          </Box>
          <Box className="flex-row h-1 gap-1">
            <Text color={theme.info} width={6} wrap="nowrap">
              SEV-3
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              ticket only · 24h
            </Text>
          </Box>
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
          <Divider title=" last 30 days " color={theme.border} titleColor={theme.subtle} />
          <Text color={theme.subtle} wrap="nowrap">
            12 incidents · MTTR 41m · 0 pages missed
          </Text>
        </Panel>

        <Panel title={` ${incident.id} · ${incident.state} `} grow>
          <Box className="flex-col gap-0 shrink-0">
            <Text bold color={theme.fg} wrap="truncate-end">
              {incident.title}
            </Text>
            <Box className="flex-row gap-3">
              <Text color={SEVERITY_COLOR[incident.severity]} wrap="nowrap">
                {incident.severity}
              </Text>
              <Text color={theme.subtle} wrap="nowrap">
                {`IC ${incident.commander}`}
              </Text>
              <Text color={theme.subtle} wrap="nowrap">
                {`service ${incident.service}`}
              </Text>
              <Text color={theme.subtle} wrap="nowrap">
                {`open ${elapsed(tick, 14)}`}
              </Text>
            </Box>
            <Text color={theme.muted} wrap="truncate-end">
              {`impact · ${incident.impact}`}
            </Text>
          </Box>

          <Divider title=" live signals " color={theme.border} titleColor={theme.subtle} />
          {[
            { label: "5xx rate", value: pct(0.0042 + 0.0004 * Math.sin(tick / 3), 2), series: series(hash("inc-5xx"), tick, 18, { base: 42, amp: 6, min: 0 }), color: theme.danger },
            { label: "p95", value: ms(212 + 14 * Math.sin(tick / 4)), series: series(hash("inc-p95"), tick, 18, { base: 212, amp: 22, min: 0 }), color: theme.warning },
            { label: "req/s", value: compact(18400), series: series(hash("inc-rps"), tick, 18, { base: 18400, amp: 900, min: 0 }), color: theme.accent },
          ].map((signal) => (
            <Box key={signal.label} className="flex-row h-1 gap-2 items-center">
              <Text color={theme.subtle} width={9} wrap="nowrap">
                {signal.label}
              </Text>
              <Sparkline
                data={signal.series}
                width={22}
                min={bounds(signal.series).min}
                max={bounds(signal.series).max}
                color={signal.color}
              />
              <Box className="grow" />
              <Text color={signal.color} wrap="nowrap">
                {signal.value}
              </Text>
            </Box>
          ))}

          <Box className="py-1 shrink-0">
            <Divider title=" Timeline " color={theme.border} titleColor={theme.subtle} />
          </Box>

          <Timeline incident={incident} />

          <Box className="grow" />

          <Divider color={theme.border} />
          <Box className="flex-row gap-3 shrink-0">
            <Stat label="TIME TO ACK" value="2m 14s" />
            <Stat label="TIME TO MITIGATE" value={incident.state === "resolved" ? "28m" : "—"} />
            <Stat label="CUSTOMERS" value={incident.severity === "SEV-1" ? "1,204" : "2"} color={theme.warning} />
          </Box>
          <Text color={theme.subtle} wrap="truncate-end">
            {`next: ${incident.state === "resolved" ? "postmortem due in 48h" : "rollback dpl_8c1d if 5xx > 1% for 5m"}`}
          </Text>
        </Panel>
      </SplitPane>
    </Box>
  );
}
