import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const caps = [
  [0, 5.4, "Welcome, everyone.  Agents forget."],
  [5.4, 10.8, "AgentKeep.  Keep going."],
  [10.8, 18.0, "agentkeep.online   ·   No signup"],
  [18.0, 25.2, "Memory  ·  Artifacts  ·  Notify  ·  Fetch  ·  Trust  ·  Budget"],
  [25.2, 32.4, "From an unpaid call to a session"],
  [32.4, 39.6, "Copy, settle, keep"],
  [39.6, 46.2, "USDC per call   ·   $2 daily cap"],
  [46.2, 52.8, "Try it.  Store a value."],
  [52.8, 58.8, "The agent skill"],
  [58.8, 66.0, "llms.txt"],
  [66.0, 72.6, "session required"],
  [72.6, 79.2, "Algorand   ·   x402   ·   GoPlausible"],
  [79.2, 90.0, "Let's check out the demo."],
];

mkdirSync("out/caps", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 100 }, deviceScaleFactor: 1 });
await page.goto("file://" + process.cwd() + "/captions.html");
await page.waitForFunction(() => window.assetsReady === true);
await page.evaluate(() => document.fonts.ready);

for (let i = 0; i < caps.length; i++) {
  const text = caps[i][2];
  await page.evaluate((str) => window.drawCaption(str), text);
  const path = `out/caps/c${String(i).padStart(2, "0")}.png`;
  await page.locator("#c").screenshot({ path, type: "png" });
  console.log(path, text);
}
await browser.close();

const inputs = ["-i", "out/agentkeep-90-narrated.mp4", "-i", "out/vo/bright.mp3", "-i", "out/score.wav"];
caps.forEach((_, i) => inputs.push("-loop", "1", "-i", `out/caps/c${String(i).padStart(2, "0")}.png`));

let chain = "";
let prev = "0:v";
caps.forEach((c, i) => {
  const out = i === caps.length - 1 ? "v" : `v${i}`;
  const src = i + 3;
  chain += `[${prev}][${src}:v]overlay=0:980:enable='between(t,${c[0]},${c[1]})'[${out}];`;
  prev = out;
});
const audio = "[1:a]aresample=48000,apad=whole_dur=90,volume=1.05,asplit=2[vo][sc];[2:a]aresample=48000,volume=0.18[score];[score][sc]sidechaincompress=threshold=0.015:ratio=8:attack=8:release=260[bed];[bed][vo]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95,atrim=0:90[a]";
const fc = chain + audio;

const args = ["-y", ...inputs, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", "90", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "out/agentkeep-90-voice.mp4"];
const run = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);
