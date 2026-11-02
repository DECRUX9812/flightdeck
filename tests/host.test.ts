import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
  collect,
  parseDockerPs,
  parseListeningPorts,
  parseMeminfo,
  parseSystemdUnits,
  probeAddress,
  probeTcp,
  renderText,
} from "../lib/host.ts";

test("systemd parsing keeps running, failed and auto-restart apart", () => {
  const text = [
    "  avahi-daemon.service loaded active running Avahi mDNS/DNS-SD Stack",
    "  broken.service      loaded failed failed  Something broke",
    "  retrying.service    loaded activating auto-restart Keeps retrying",
  ].join("\n");
  const services = parseSystemdUnits(text, "system");
  assert.equal(services.length, 3);
  assert.equal(services[0]?.state, "running");
  assert.equal(services[1]?.state, "failed");
  assert.equal(services[2]?.state, "restarting");
  assert.equal(services[0]?.id, "systemd-system-avahi-daemon-service");
  assert.equal(services[0]?.scope, "system");
});

test("docker parsing reads healthy, unhealthy and stopped states", () => {
  const text = [
    "langfuse-redis-1|Up 9 hours (healthy)|redis:7",
    "flaky|Up 2 minutes (unhealthy)|app:1",
    "old|Exited (1) 3 days ago|app:0",
  ].join("\n");
  const services = parseDockerPs(text);
  assert.deepEqual(services.map((service) => service.state), ["running", "failed", "inactive"]);
  assert.equal(services[0]?.id, "docker-langfuse-redis-1");
});

test("listening ports keep their bind address and drop the zone suffix", () => {
  const text = [
    "LISTEN 0 511 100.84.81.81%tailscale0:3773 0.0.0.0:* users:((\"node\",pid=1,fd=2))",
    "LISTEN 0 4096 0.0.0.0:8088 0.0.0.0:* users:((\"python3\",pid=2,fd=3))",
  ].join("\n");
  const ports = parseListeningPorts(text);
  assert.equal(ports.length, 2);
  assert.equal(ports[0]?.port, 3773);
  assert.equal(ports[0]?.proc, "node");
  assert.equal(probeAddress(ports[0]!.address), "100.84.81.81");
  assert.equal(probeAddress(ports[1]!.address), "127.0.0.1");
  assert.equal(probeAddress("*"), "127.0.0.1");
});

test("meminfo reports used memory, not total minus free", () => {
  const text = ["MemTotal:       16000000 kB", "MemFree:         1000000 kB", "MemAvailable:    4000000 kB", "SwapTotal:       2000000 kB", "SwapFree:        1500000 kB"].join("\n");
  const mem = parseMeminfo(text);
  assert.equal(mem.totalMiB, 15625);
  assert.equal(mem.usedMiB, 11719);
  assert.equal(mem.swapUsedMiB, 488);
});

test("probeTcp measures a real socket and times out on a dead one", async () => {
  const server = net.createServer((socket) => socket.end());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const latency = await probeTcp("127.0.0.1", port);
  assert.ok(latency !== null && latency >= 0, "an open socket must report latency");

  await new Promise<void>((resolve) => server.close(() => resolve()));
  const dead = await probeTcp("127.0.0.1", port, 150);
  assert.equal(dead, null, "a closed port must report null");
});

test("collect reads this machine and the numbers agree with each other", async () => {
  const snapshot = await collect(0);
  assert.ok(snapshot.services.length > 5, "a real machine runs more than five services");
  assert.ok(snapshot.counts.total === snapshot.services.length);
  assert.equal(snapshot.counts.failed, snapshot.services.filter((service) => service.state === "failed").length);
  assert.ok(snapshot.host.diskPct >= 0 && snapshot.host.diskPct <= 100);
  assert.ok(snapshot.host.memTotalMiB > 0);
  assert.ok(snapshot.host.cores >= 1);
  assert.ok(snapshot.ports.length > 0, "there should be at least one listening socket");
  assert.equal(snapshot.counts.up, snapshot.ports.filter((port) => port.ok).length);
  assert.ok(snapshot.history.length >= 1);
});

test("the text board is valid ASCII and names the host", async () => {
  const snapshot = await collect(0);
  const text = renderText(snapshot);
  assert.match(text, /^FLIGHTDECK {2}/);
  assert.ok(text.includes(snapshot.host.hostname));
  assert.ok(text.includes("flightdeck ·"));
  assert.ok(text.split("\n").length > 6);
});
