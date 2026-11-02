"use client";

import type { ReactNode } from "react";
import { Box, Sparkline, Text, useTheme } from "@textjs/app";

export interface PanelProps {
  title?: string;
  right?: ReactNode;
  children?: ReactNode;
  grow?: boolean;
  height?: number;
  className?: string;
}

/** A bordered panel with a title baked into the top border. */
export function Panel({ title, right, children, grow, height, className }: PanelProps): ReactNode {
  const theme = useTheme();
  return (
    <Box
      className={["flex-col border rounded px-1 min-h-0", grow ? "grow" : "", className ?? ""].join(" ").trim()}
      borderColor={theme.border}
      height={height}
      title={title ? ` ${title} ` : undefined}
      titleColor={theme.subtle}
    >
      {right ? (
        <Box className="flex-row h-1 shrink-0">
          <Box className="grow" />
          {right}
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  unit?: string;
  data: readonly number[];
  color?: string;
  min?: number;
  max?: number;
  hint?: string;
}

/** A single KPI: label, headline number, delta and a live sparkline. */
export function MetricCard({ label, value, delta, unit, data, color, min, max, hint }: MetricCardProps): ReactNode {
  const theme = useTheme();
  const up = (delta ?? 0) >= 0;
  return (
    <Box className="flex-col grow basis-0 border rounded px-1 min-w-0 shrink-0" borderColor={theme.border} height={5}>
      <Box className="flex-row h-1">
        <Text color={theme.subtle} wrap="nowrap">
          {label.toUpperCase()}
        </Text>
        <Box className="grow" />
        {delta === undefined ? (
          <Text color={theme.subtle} wrap="nowrap">
            {hint ?? ""}
          </Text>
        ) : (
          <Text color={up ? theme.warning : theme.success} wrap="nowrap">{`${up ? "▲" : "▼"} ${Math.abs(delta * 100).toFixed(1)}%`}</Text>
        )}
      </Box>
      <Box className="flex-row h-1 items-baseline">
        <Text bold color={color ?? theme.fg} wrap="nowrap">
          {value}
        </Text>
        {unit ? (
          <Text color={theme.muted} wrap="nowrap">
            {unit}
          </Text>
        ) : null}
      </Box>
      <Box className="grow min-h-0">
        {data.length >= 3 ? (
          <Sparkline data={data} color={color ?? theme.accent} height={1} min={min} max={max} />
        ) : (
          <Text color={theme.subtle} wrap="nowrap">
            sampling…
          </Text>
        )}
      </Box>
    </Box>
  );
}

/** A labelled statistic used in detail headers. */
export function Stat({ label, value, color }: { label: string; value: string; color?: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col shrink-0" width={Math.max(label.length, value.length) + 2}>
      <Text color={theme.subtle} wrap="nowrap">
        {label}
      </Text>
      <Text bold color={color ?? theme.fg} wrap="nowrap">
        {value}
      </Text>
    </Box>
  );
}

/** A muted label + a value, laid out in one row. */
export function Field({ label, children, width = 12 }: { label: string; children?: ReactNode; width?: number }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-row h-1 gap-1">
      <Text color={theme.subtle} width={width} wrap="nowrap">
        {label}
      </Text>
      {children}
    </Box>
  );
}
