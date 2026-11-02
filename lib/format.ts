export function humanAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.round((seconds % 86400) / 3600)}h`;
}

export function pct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function ms(value: number | null | undefined): string {
  if (value === null || value === undefined) return "timeout";
  return `${value.toFixed(1)}ms`;
}
