import "server-only";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const KANDIDAT = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function chromePath(): string {
  const p = KANDIDAT.find((k) => k && existsSync(k));
  if (!p) throw new Error("Chrome/Chromium tidak ditemukan. Isi CHROME_PATH di .env.local.");
  return p;
}

/** HTML → PDF A4 berisi teks asli (bisa di-select), bukan gambar. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  // ponytail: satu browser per permintaan (~1 detik). Pakai browser bersama bila ekspor jadi sering.
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
