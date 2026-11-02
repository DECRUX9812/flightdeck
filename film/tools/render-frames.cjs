/**
 * Turns captured console frames into a 1920x1080 footage clip.
 * Each JSON frame is painted into a console window and screenshotted;
 * ffmpeg then honours the real frame timestamps at 30 fps.
 */
const puppeteer = require("puppeteer-core");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const [, , framesFile, outDirArg] = process.argv;
const outDir = path.resolve(outDirArg || "capture/out");
const timeline = JSON.parse(fs.readFileSync(path.resolve(framesFile), "utf8"));

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin:0; width:1920px; height:1080px; overflow:hidden; background:#0a0a0a; }
  #frame { font-family:"DejaVu Sans Mono", monospace; background:#0a0a0a; }
  .row { height:30px; line-height:30px; white-space:nowrap; }
  .c { display:inline-block; width:16px; text-align:center; overflow:hidden; vertical-align:top; font-size:25px; }
</style></head><body><div id="frame"></div>
<script>
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
window.paint = (entry) => {
  const parts = entry.fmt.split("%c");
  let html = "", row = [];
  const flush = () => { html += '<div class="row">' + row.join("") + "</div>"; row = []; };
  for (let i = 0; i < parts.length; i++) {
    const css = i === 0 ? "" : entry.styles[i - 1] || "";
    const color = /(?:^|;)color:(#[0-9a-fA-F]{3,8}|rgba?\\([^)]*\\))/.exec(css)?.[1] || "#ededed";
    const bg = /background-color:(#[0-9a-fA-F]{3,8}|rgba?\\([^)]*\\))/.exec(css)?.[1] || "#0a0a0a";
    const bold = /font-weight:\\s*(?:700|bold)/.test(css);
    for (const ch of parts[i].replace(/%%/g, "%")) {
      if (ch === "\\n") { flush(); continue; }
      row.push('<span class="c" style="color:' + color + ";background:" + bg + (bold ? ";font-weight:700" : "") + '">' + esc(ch) + "</span>");
    }
  }
  flush();
  document.getElementById("frame").innerHTML = html;
};
</script></body></html>`;

(async () => {
  fs.mkdirSync(path.join(outDir, "png"), { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.setContent(PAGE, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const files = [];
  for (let i = 0; i < timeline.length; i++) {
    await page.evaluate((entry) => window.paint(entry), timeline[i]);
    const file = path.join(outDir, "png", `f${String(i).padStart(5, "0")}.png`);
    await page.screenshot({ path: file });
    files.push(file);
    if (i % 10 === 0) process.stdout.write(`\r  frame ${i + 1}/${timeline.length}`);
  }
  await browser.close();
  process.stdout.write("\n");

  // Per-frame durations from the real capture timestamps.
  const lines = [];
  for (let i = 0; i < files.length; i++) {
    const next = timeline[i + 1] ? timeline[i + 1].at : timeline[i].at + 0.08;
    const dur = Math.max(0.03, Math.min(0.6, next - timeline[i].at));
    lines.push(`file '${files[i]}'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${files[files.length - 1]}'`);
  const listFile = path.join(outDir, "list.txt");
  fs.writeFileSync(listFile, lines.join("\n"));

  const mp4 = path.join(outDir, "clip.mp4");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-movflags", "+faststart",
    mp4,
  ]);
  const duration = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4])
    .toString()
    .trim();
  console.log(JSON.stringify({ frames: files.length, mp4, duration: Number(duration) }, null, 1));
})();
