import "server-only";
import { existsSync } from "node:fs";
import puppeteer, { type LaunchOptions } from "puppeteer-core";

const KANDIDAT = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

async function opsiPeluncuran(): Promise<LaunchOptions> {
  // Vercel/Lambda tidak punya Chrome. @sparticuz/chromium membawa Chromium yang cukup kecil untuk fungsi serverless.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { default: chromium } = await import("@sparticuz/chromium");
    return { executablePath: await chromium.executablePath(), args: chromium.args, headless: "shell" };
  }
  const p = KANDIDAT.find((k) => k && existsSync(k));
  if (!p) throw new Error("Chrome/Chromium tidak ditemukan. Isi CHROME_PATH di .env.local.");
  return { executablePath: p, headless: true, args: ["--no-sandbox", "--disable-gpu"] };
}

/** HTML → PDF A4 berisi teks asli (bisa di-select), bukan gambar. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  // ponytail: satu browser per permintaan (~1 detik lokal, 3–6 detik cold start di Vercel). Bagikan browser bila ekspor jadi sering.
  const browser = await puppeteer.launch(await opsiPeluncuran());
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
