/**
 * HTTP endpoint checks: the one data source that behaves the same on every OS.
 * A check is a name + URL; we measure status, latency and TLS expiry.
 */
import { request } from "node:https";
import { request as httpRequest } from "node:http";

export interface HttpCheckConfig {
  name: string;
  url: string;
  /** Expected status; defaults to any 2xx/3xx. */
  expect?: number;
  timeoutMs?: number;
}

export interface HttpCheckResult extends HttpCheckConfig {
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error?: string;
  tlsDaysLeft?: number | null;
}

export function checkOk(status: number | null, expect?: number): boolean {
  if (status === null) return false;
  if (expect) return status === expect;
  return status >= 200 && status < 400;
}

/** Days until the peer certificate expires, when there is one. */
export function tlsDaysLeft(validTo: string | undefined, now = Date.now()): number | null {
  if (!validTo) return null;
  const expiry = Date.parse(validTo);
  if (!Number.isFinite(expiry)) return null;
  return Math.round((expiry - now) / 86_400_000);
}

export function runCheck(check: HttpCheckConfig): Promise<HttpCheckResult> {
  const timeout = check.timeoutMs ?? 4000;
  const isHttps = check.url.startsWith("https:");
  const lib = isHttps ? request : httpRequest;

  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let settled = false;
    const finish = (result: Omit<HttpCheckResult, keyof HttpCheckConfig> & { name: string; url: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let req: ReturnType<typeof request>;
    try {
      req = lib(
        check.url,
        {
          method: "GET",
          timeout,
          headers: { "user-agent": "flightdeck/0.2 (+checks)" },
          ...(isHttps ? { rejectUnauthorized: true } : {}),
        } as never,
        (res) => {
          const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
          const socket = res.socket as { getPeerCertificate?: () => { valid_to?: string } } | null;
          const cert = socket?.getPeerCertificate?.();
          res.resume();
          finish({
            ...check,
            ok: checkOk(res.statusCode ?? null, check.expect),
            status: res.statusCode ?? null,
            latencyMs: Math.round(latencyMs * 10) / 10,
            tlsDaysLeft: tlsDaysLeft(cert?.valid_to),
          });
        },
      );
    } catch (cause) {
      finish({
        ...check,
        ok: false,
        status: null,
        latencyMs: null,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return;
    }

    req.on("timeout", () => {
      req.destroy();
      finish({ ...check, ok: false, status: null, latencyMs: null, error: "timeout" });
    });
    req.on("error", (cause) => {
      finish({ ...check, ok: false, status: null, latencyMs: null, error: cause.message });
    });
    req.end();
  });
}

export async function runChecks(checks: HttpCheckConfig[]): Promise<HttpCheckResult[]> {
  const results: HttpCheckResult[] = [];
  for (const check of checks) results.push(await runCheck(check));
  return results;
}
