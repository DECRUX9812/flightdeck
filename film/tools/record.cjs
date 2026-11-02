/**
 * Records the real Flightdeck console output as a screen capture.
 *
 * The app logs one `console.log` per changed frame; this page-side hook paints
 * those frames into a console window and CDP screencast records the result, so
 * the footage is the product's own output — not a mockup.
 */
const puppeteer = require("puppeteer-core");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const [, , url, outDirArg, secondsArg, keysArg] = process.argv;
const outDir = path.resolve(outDirArg || "capture/clip");
const SECONDS = Number(secondsArg || 6);
const KEYS = (keysArg || "").split(",").filter(Boolean);

const FONT = "DejaVu Sans Mono";

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: process.env.HEADFUL ? false : "new",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1920,1080",
      "--disable-gpu-vsync",
      "--disable-frame-rate-limit",
    ],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  // Capture frames before the app starts logging.
  await page.evaluateOnNewDocument(() => {
    window.__raw = [];
    const orig = console.log;
    console.log = function (...args) {
      if (typeof args[0] === "string" && args[0].includes("%c")) {
        window.__raw.push({ fmt: args[0], styles: args.slice(1).map(String) });
        if (window.__raw.length > 6) window.__raw.shift();
      }
      return orig.apply(this, args);
    };
  });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

  // Paint the newest frame into a console window that fills the capture.
  await page.evaluate((font) => {
    const style = document.createElement("style");
    style.textContent = `
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden;
        background: #15171c; }
      body > *:not(#rec) { display: none !important; }
      #rec { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
        background: radial-gradient(120% 90% at 50% 0%, #1c2028 0%, #121419 60%, #0e1013 100%); }
      #shell { background: #0a0a0a; border: 1px solid #262b33; border-radius: 14px;
        padding: 16px 18px; box-shadow: 0 40px 120px rgba(0,0,0,.55); }
      #bar { display: flex; align-items: center; gap: 8px; height: 30px; margin: 0 0 10px; }
      .dot { width: 10px; height: 10px; border-radius: 50%; }
      #title { font: 12px/1 -apple-system, "Segoe UI", sans-serif; color: #6b7280; margin-left: 8px; }
      #frame { font-family: "${font}", monospace; }
      .row { height: 26px; line-height: 26px; white-space: nowrap; }
      .c { display: inline-block; width: 13px; text-align: center; overflow: hidden; vertical-align: top; }
    `;
    document.head.appendChild(style);

    const rec = document.createElement("div");
    rec.id = "rec";
    rec.innerHTML = `<div id="shell"><div id="bar">
      <span class="dot" style="background:#ff5f57"></span>
      <span class="dot" style="background:#febc2e"></span>
      <span class="dot" style="background:#28c840"></span>
      <span id="title">Console — Flightdeck · textjs</span></div><div id="frame"></div></div>`;
    document.body.appendChild(rec);

    const frameEl = rec.querySelector("#frame");
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    function paint(entry) {
      const parts = entry.fmt.split("%c");
      let html = "";
      let row = [];
      const flush = () => {
        html += `<div class="row">${row.join("")}</div>`;
        row = [];
      };
      for (let i = 0; i < parts.length; i++) {
        const css = i === 0 ? "" : entry.styles[i - 1] || "";
        const color = /(?:^|;)color:(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/.exec(css)?.[1] || "#ededed";
        const bg = /background-color:(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/.exec(css)?.[1] || "#0a0a0a";
        const bold = /font-weight:\s*(?:700|bold)/.test(css);
        const text = parts[i].replace(/%%/g, "%");
        for (const ch of text) {
          if (ch === "\n") {
            flush();
            continue;
          }
          row.push(
            `<span class="c" style="color:${color};background:${bg}${bold ? ";font-weight:700" : ""}">${esc(ch)}</span>`,
          );
        }
      }
      flush();
      frameEl.innerHTML = html;
      window.__painted = (window.__painted || 0) + 1;
    }

    let last = null;
    setInterval(() => {
      const raw = window.__raw[window.__raw.length - 1];
      if (raw && raw !== last) {
        last = raw;
        paint(raw);
      }
    }, 33);
  }, FONT);

  await new Promise((r) => setTimeout(r, 1200));

  const client = await page.createCDPSession();
  const frames = [];
  client.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    frames.push({ data, ts: metadata.timestamp });
    try {
      await client.send("Page.screencastFrameAck", { sessionId });
    } catch {}
  });
  await client.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1,
  });

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

  await client.send("Page.stopScreencast");
  await browser.close();

  if (frames.length < 10) throw new Error(`only ${frames.length} frames captured`);

  // Write frames and a duration list, then encode CFR 30 fps.
  const dir = path.join(outDir, "frames");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const lines = [];
  const base = frames[0].ts;
  for (let i = 0; i < frames.length; i++) {
    const file = path.join(dir, `f${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(frames[i].data, "base64"));
    const next = frames[i + 1] ? frames[i + 1].ts : frames[i].ts + 0.05;
    const dur = Math.max(0.008, Math.min(0.5, next - frames[i].ts));
    lines.push(`file '${file}'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
  const listFile = path.join(outDir, "frames.txt");
  fs.writeFileSync(listFile, lines.join("\n"));

  const mp4 = path.join(outDir, "clip.mp4");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart",
    mp4,
  ]);
  const span = frames[frames.length - 1].ts - base;
  console.log(JSON.stringify({ url, frames: frames.length, span: Number(span.toFixed(2)), mp4 }, null, 1));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
