import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

const VOICE = "Reed (English (US))";
const RATE = "164";
const DUR = 90;

const lines = [
  [0.4, "Agents forget. The next call starts from nothing."],
  [5.7, "AgentKeep keeps what the last call learned."],
  [11.1, "agentkeep.online. No signup. The wallet is the account."],
  [18.4, "Memory, artifacts, notify, fetch, trust, and budget."],
  [25.6, "Unpaid calls return four oh two. Settle, and the session lasts fifteen minutes."],
  [32.8, "Copy the call. Settle. Then read it back."],
  [40.0, "U S D C per call. The hard cap is two dollars a day."],
  [46.6, "Connect a wallet. A write costs one tenth of a cent."],
  [53.1, "The skill tells an agent when to call."],
  [59.2, "The A P I lists every route, the pay to, and the rules."],
  [66.4, "No session, no read."],
  [73.0, "Algorand. x four oh two. GoPlausible."],
  [80.0, "No keys. No dashboard."],
  [84.6, "Let's check out the demo."],
];

mkdirSync("out/vo", { recursive: true });
const placed = [];
let cursor = 0;
lines.forEach((row, i) => {
  const [want, text] = row;
  const aiff = `out/vo/${String(i).padStart(2, "0")}.aiff`;
  const say = spawnSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, text], { stdio: "inherit" });
  if (say.status !== 0) process.exit(say.status ?? 1);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", aiff], { encoding: "utf8" });
  const len = Number(probe.stdout.trim());
  const start = Math.max(want, cursor);
  placed.push({ start, len, text, aiff });
  cursor = start + len + 0.32;
  console.log(`${start.toFixed(2)}  ${len.toFixed(2)}s  ${text}`);
});

const last = placed[placed.length - 1];
if (last.start + last.len > DUR - 0.35) {
  console.error("narration runs past the film", (last.start + last.len).toFixed(2));
  process.exit(1);
}

rmSync("out/narration.wav", { force: true });
const inputs = placed.flatMap((p) => ["-i", p.aiff]);
const delays = placed.map((p, i) => `[${i}:a]aresample=48000,adelay=${Math.round(p.start * 1000)}:all=1[a${i}]`);
const mix = placed.map((_, i) => `[a${i}]`).join("");
const filter = `${delays.join(";")};${mix}amix=inputs=${placed.length}:duration=longest:normalize=0,apad=whole_dur=${DUR},atrim=0:${DUR}`;
const ff = spawnSync("ffmpeg", ["-y", ...inputs, "-filter_complex", filter, "-c:a", "pcm_s16le", "out/narration.wav"], { stdio: "inherit" });
if (ff.status !== 0) process.exit(ff.status ?? 1);
console.log("out/narration.wav");
