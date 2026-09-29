import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("assets/shots", { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

async function settle() {
  await page.addStyleTag({
    content: `
      .ak-reveal, .ak-line-draw { opacity: 1 !important; transform: none !important; animation: none !important; }
      * { scroll-behavior: auto !important; }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function shot(name, url, selector) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await settle();
  if (selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  const path = `assets/shots/${name}.png`;
  await page.screenshot({ path, type: "png" });
  console.log(path);
}

const sections = [
  ["site-hero", "https://agentkeep.online/", null],
  ["site-features", "https://agentkeep.online/", "#features"],
  ["site-how", "https://agentkeep.online/", "#how"],
  ["site-developers", "https://agentkeep.online/", "#developers"],
  ["site-prices", "https://agentkeep.online/", "#prices"],
  ["site-faq", "https://agentkeep.online/", "#faq"],
  ["app-keep", "https://agentkeep.online/keep", null],
  ["site-skill", "https://agentkeep.online/skill", null],
  ["api-llms", "https://api.agentkeep.online/llms.txt", null],
  ["api-health", "https://api.agentkeep.online/health", null],
  ["api-402", "https://api.agentkeep.online/v1/memory/plan", null],
  ["api-x402", "https://api.agentkeep.online/.well-known/x402", null],
];

for (const [name, url, sel] of sections) {
  try {
    await shot(name, url, sel);
  } catch (err) {
    console.error("FAIL", name, err.message);
  }
}

await browser.close();
