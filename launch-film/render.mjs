import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const FPS = Number(arg("fps", 30));
const DUR = Number(arg("dur", 90));
const SUB = Number(arg("sub", 2));
const STILLS = arg("stills", "");
const FROM = Number(arg("from", 0));
const OUT = arg("out", "out/silent.mp4");
const W = 1920;
const H = 1080;

mkdirSync("out", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
await page.goto("file://" + process.cwd() + "/index.html");
await page.waitForFunction(() => window.assetsReady === true, null, { timeout: 15000 });
await page.evaluate(() => document.fonts.ready);

if (STILLS) {
  mkdirSync("out/stills", { recursive: true });
  for (const raw of STILLS.split(",")) {
    const t = Number(raw);
    await page.evaluate((tt) => window.seek(tt), t);
    const name = `out/stills/t${String(t).replace(".", "_")}.png`;
    await page.locator("#c").screenshot({ path: name, type: "png" });
    console.log(name);
  }
  await browser.close();
  process.exit(0);
}

const vf = `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`;
const ff = spawn(
  "ffmpeg",
  [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(FPS * SUB),
    "-i", "-",
    "-vf", vf,
    "-r", String(FPS),
    "-c:v", "libx264",
    "-crf", "16",
    "-pix_fmt", "yuv420p",
    OUT,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const total = Math.round((DUR - FROM) * FPS * SUB);
for (let i = 0; i < total; i++) {
  const t = FROM + i / (FPS * SUB);
  await page.evaluate((tt) => window.seek(tt), t);
  const png = await page.locator("#c").screenshot({ type: "png" });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${t.toFixed(1)}s / ${DUR}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log(OUT);
