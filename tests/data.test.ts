import test from "node:test";
import assert from "node:assert/strict";
import {
  SERVICES,
  activityFeed,
  bounds,
  clockFrom,
  compact,
  fleetTotals,
  hash,
  liveService,
  ms,
  pct,
  series,
} from "../lib/data.ts";

test("series is deterministic for the same seed and tick", () => {
  const a = series(0.42, 17, 24, { base: 100, amp: 10 });
  const b = series(0.42, 17, 24, { base: 100, amp: 10 });
  assert.deepEqual(a, b);
  assert.equal(a.length, 24);
});

test("series clamps to its bounds", () => {
  const values = series(hash("x"), 5, 40, { base: 50, amp: 1e6, min: 10, max: 90 });
  for (const value of values) {
    assert.ok(value >= 10 && value <= 90, `${value} outside [10, 90]`);
  }
});

test("a downed service reports zeros, not noise", () => {
  const down = SERVICES.find((service) => service.status === "down");
  assert.ok(down, "fixture needs one downed service");
  const live = liveService(down!, 12);
  assert.equal(live.liveRps, 0);
  assert.equal(live.liveP95, 0);
  assert.equal(live.liveBudget, 0);
});

test("fleet totals stay in sane ranges", () => {
  const totals = fleetTotals(3);
  assert.ok(totals.rps > 0);
  assert.ok(totals.err >= 0 && totals.err <= 1);
  assert.ok(totals.budget >= 0 && totals.budget <= 1);
  assert.ok(totals.healthy >= 1 && totals.healthy <= SERVICES.length);
});

test("formatters round the way the UI expects", () => {
  assert.equal(ms(12.4), "12ms");
  assert.equal(ms(1234), "1.23s");
  assert.equal(pct(0.0042, 2), "0.42%");
  assert.equal(compact(238_400), "238k");
  assert.equal(clockFrom(3723), "01:02:03");
});

test("activity feed is newest first and ordered", () => {
  const feed = activityFeed(40, 4, 15 * 3600 + 30 * 60);
  assert.equal(feed.length, 4);
  for (let i = 1; i < feed.length; i++) {
    assert.ok(feed[i - 1]!.time > feed[i]!.time, "timestamps must descend");
  }
});

test("bounds widens a flat series so charts still render", () => {
  const range = bounds([5, 5, 5, 5]);
  assert.ok(range.min < 5 && range.max > 5);
});
