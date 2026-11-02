/**
 * Captures the app's real console output as a timed frame list (JSON).
 * No screenshots: we record the exact `%c` payloads the product logs.
 */
const puppeteer = require("puppeteer-core");
const fs = require("node:fs");
const path = require("node:path");

const [, , url, outFile, secondsArg, keysArg] = process.argv;
const SECONDS = Number(secondsArg || 6);
const KEYS = (keysArg || "").split(",").filter(Boolean);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    window.__frames = [];
    const orig = console.log;
    console.log = function (...args) {
      if (typeof args[0] === "string" && args[0].includes("%c")) {
        window.__frames.push({ t: performance.now(), fmt: args[0], styles: args.slice(1).map(String) });
      }
      return orig.apply(this, args);
    };
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 900));

  const started = Date.now();
  for (const combo of KEYS) {
    const [delay, key] = combo.split(":");
    await new Promise((r) => setTimeout(r, Number(delay)));
    const parts = key.split("+");
    const mods = parts.length > 1 ? parts.slice(0, -1) : [];
    for (const m of mods) await page.keyboard.down(m);
    await page.keyboard.press(parts[parts.length - 1]);
    for (const m of mods.reverse()) await page.keyboard.up(m);
  }
  const remaining = SECONDS * 1000 - (Date.now() - started);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

  const frames = await page.evaluate(() => window.__frames);
  await browser.close();

  if (frames.length < 8) throw new Error(`only ${frames.length} frames`);
  const t0 = frames[0].t;
  const timeline = frames.map((f) => ({ at: (f.t - t0) / 1000, fmt: f.fmt, styles: f.styles }));
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(path.resolve(outFile), JSON.stringify(timeline));
  const span = timeline[timeline.length - 1].at;
  console.log(
    JSON.stringify(
      { url, frames: timeline.length, span: Number(span.toFixed(2)), fps: Number((timeline.length / span).toFixed(1)), size: fs.statSync(path.resolve(outFile)).size },
      null,
      1,
    ),
  );
})();
