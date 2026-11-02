import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { checkOk, runCheck, tlsDaysLeft } from "../lib/checks.ts";

test("checkOk accepts 2xx/3xx and honours an expected status", () => {
  assert.equal(checkOk(200), true);
  assert.equal(checkOk(302), true);
  assert.equal(checkOk(404), false);
  assert.equal(checkOk(null), false);
  assert.equal(checkOk(404, 404), true);
  assert.equal(checkOk(200, 404), false);
});

test("tlsDaysLeft rounds a certificate expiry to whole days", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.equal(tlsDaysLeft("Mar 1 00:00:00 2026 GMT", now), 59);
  assert.equal(tlsDaysLeft(undefined, now), null);
  assert.equal(tlsDaysLeft("not a date", now), null);
});

test("a real HTTP endpoint is measured end to end", async () => {
  const server = http.createServer((_req, res) => {
    res.statusCode = 204;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const ok = await runCheck({ name: "local", url: `http://127.0.0.1:${port}/` });
  assert.equal(ok.ok, true);
  assert.equal(ok.status, 204);
  assert.ok(ok.latencyMs !== null && ok.latencyMs >= 0);

  const wrong = await runCheck({ name: "local", url: `http://127.0.0.1:${port}/`, expect: 200 });
  assert.equal(wrong.ok, false, "an expected status that does not match must fail");

  await new Promise<void>((resolve) => server.close(() => resolve()));
  const dead = await runCheck({ name: "dead", url: `http://127.0.0.1:${port}/`, timeoutMs: 800 });
  assert.equal(dead.ok, false);
  assert.ok(dead.error, "a closed port must report an error");
});
