// Uji alur penuh lewat Chrome sungguhan: pnpm smoke  (server dev harus jalan; BASE=http://localhost:3300)
// Membuat klien uji, menjalankan seluruh alur, lalu menghapusnya lagi. Tangkapan layar masuk ke ./shots.
import { mkdirSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

try { process.loadEnvFile(".env.local"); } catch { /* env dari shell */ }
const BASE = process.env.BASE ?? "http://localhost:3300";
const EMAIL = process.env.ADMIN_EMAIL;
const PASS = process.env.ADMIN_PASSWORD;
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
mkdirSync("shots", { recursive: true });

let ok = 0;
const cek = (nama, kondisi, info = "") => {
  if (!kondisi) throw new Error(`GAGAL: ${nama} ${info}`);
  console.log(`  ✓ ${nama}`);
  ok++;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 1360, height: 900 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });

const go = (p) => page.goto(BASE + p, { waitUntil: "networkidle0" });
const fill = (name, v) => page.$eval(`[name="${name}"]`, (el, val) => { el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const tick = (name, on = true) => page.$eval(`[name="${name}"]`, (el, v) => { el.checked = v; }, on);
const klik = async (teks, scope = "body") => {
  const [h] = await page.$$(`xpath/.//${scope === "body" ? "" : ""}button[contains(normalize-space(.), "${teks}")]`);
  if (!h) throw new Error(`tombol "${teks}" tidak ada di ${page.url()}`);
  await Promise.all([page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 }).catch(() => {}), h.click()]);
  await new Promise((r) => setTimeout(r, 400));
};
const teks = () => page.evaluate(() => document.body.innerText);
const shot = (n) => page.screenshot({ path: `shots/${n}.png`, fullPage: n.includes("full") });
const pecah = (u) => new URL(u).pathname.split("/").filter(Boolean);

console.log("Masuk");
await go("/masuk");
await fill("email", EMAIL); await fill("password", PASS);
await shot("01-masuk");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click("button[type=submit]")]);
cek("admin masuk ke dasbor", (await teks()).includes("Dasbor"), page.url());
await shot("02-dasbor");

console.log("Klien dan biodata");
await go("/klien/baru");
await fill("nama", "Sari Dewi Uji"); await fill("hp", "081234567890"); await fill("email", "sari.uji@contoh.id"); await tick("setuju");
await klik("Buat klien");
const id = pecah(page.url())[1];
cek("klien terbentuk", pecah(page.url())[0] === "klien" && id?.length === 36, page.url());

await go(`/klien/${id}/profil`);
await fill("kota", "Semarang"); await fill("ringkasan", "Staf administrasi 4 tahun, terbiasa mengelola arsip dan laporan bulanan.");
await fill("tempat_lahir", "Semarang"); await fill("tgl_lahir", "1998-05-12"); await fill("status_nikah", "Belum menikah"); await fill("agama", "Islam");
await klik("Simpan biodata");
cek("biodata tersimpan", (await teks()).includes("Biodata tersimpan"));

const entry = async (tipe, v) => {
  await go(`/klien/${id}/entry/baru?tipe=${tipe}`);
  for (const [k, val] of Object.entries(v)) {
    if (k === "berjalan") await tick(k); else await fill(k, val);
  }
  await klik("Tambahkan");
};
await entry("kerja", { judul: "Staf Administrasi", instansi: "PT Maju Jaya", lokasi: "Semarang", mulai: "2021-02", berjalan: true, butir: "Mengelola arsip 1.200 dokumen per bulan\nMenyusun laporan bulanan untuk direksi" });
await entry("kerja", { judul: "Admin Magang", instansi: "CV Sinar", lokasi: "Semarang", mulai: "2020-06", selesai: "2020-12", butir: "Mengarsipkan surat masuk dan keluar" });
await entry("pendidikan", { judul: "S1 Manajemen", instansi: "Universitas Diponegoro", mulai: "2016-08", selesai: "2020-07", deskripsi: "IPK 3,62" });
await entry("skill", { judul: "Microsoft Excel", deskripsi: "Mahir" });
await entry("skill", { judul: "Pengarsipan", deskripsi: "Mahir" });
await go(`/klien/${id}`);
const hub = await teks();
cek("hub memuat riwayat", hub.includes("Staf Administrasi") && hub.includes("S1 Manajemen") && hub.includes("Microsoft Excel"));
await shot("03-hub-full");

console.log("CV, preview, ekspor");
await fill("label", "CV Administrasi"); await fill("target", "Staf Administrasi");
await klik("Buat CV");
await page.waitForFunction(() => location.pathname.startsWith("/cv/"), { timeout: 30000 }).catch(() => {});
const cvId = pecah(page.url())[1];
cek("CV terbentuk dan masuk editor", pecah(page.url())[0] === "cv" && cvId?.length === 36, page.url());
const frameSrc = await page.$eval(".paper iframe", (f) => f.getAttribute("src"));
cek("preview memakai route html", frameSrc.startsWith(`/api/cv/${cvId}/html?kertas=1`));
const ambil = (p) => page.evaluate(async (u) => {
  const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer());
  return { status: r.status, tipe: r.headers.get("content-type"), awal: Array.from(b.slice(0, 5)), panjang: b.length, teks: r.headers.get("content-type")?.includes("html") ? new TextDecoder().decode(b) : "" };
}, p);
const html = await ambil(`/api/cv/${cvId}/html`);
cek("HTML berisi nama dan pengalaman", html.teks.includes("Sari Dewi Uji") && html.teks.includes("PT Maju Jaya") && html.teks.includes("Pengalaman Kerja") && html.teks.includes("Microsoft Excel (Mahir)"));
cek("HTML tanpa tabel", !html.teks.includes("<table"));
const pdf = await ambil(`/api/cv/${cvId}/pdf`);
cek("PDF valid", pdf.status === 200 && String.fromCharCode(...pdf.awal) === "%PDF-" && pdf.panjang > 4000, `${pdf.status} ${pdf.panjang}`);
const docx = await ambil(`/api/cv/${cvId}/docx`);
cek("DOCX valid (zip)", docx.status === 200 && docx.awal[0] === 0x50 && docx.awal[1] === 0x4b && docx.panjang > 2000, `${docx.status} ${docx.panjang}`);
await shot("04-editor");

console.log("Edit CV, override poin, versi");
await fill("template", "ringkas");
const bukaSemua = await page.$$eval("details.entry-pick", (ds) => { ds.forEach((d) => (d.open = true)); return ds.length; });
cek("entry terdaftar di editor", bukaSemua >= 5, String(bukaSemua));
// override poin untuk pengalaman pertama yang punya textarea
const nm = await page.$$eval('textarea[name^="butir_"]', (ts) => ts[0]?.name);
await fill(nm, "Mengelola arsip dan memangkas waktu pencarian dokumen dari 15 menit menjadi 3 menit");
await klik("Simpan perubahan");
cek("CV tersimpan", (await teks()).includes("Tersimpan"));
const html2 = await ambil(`/api/cv/${cvId}/html`);
cek("override poin berlaku di CV", html2.teks.includes("dari 15 menit menjadi 3 menit"));
await go(`/klien/${id}/entry/baru?tipe=bahasa`);
await fill("judul", "Bahasa Inggris"); await fill("deskripsi", "Aktif");
await klik("Tambahkan");
await go(`/klien/${id}`);
cek("data baru terdeteksi belum masuk CV", (await teks()).includes("1 data belum masuk CV"));
await go(`/cv/${cvId}`);
await fill("catatan", "Versi pertama"); await klik("Simpan sebagai versi baru");
cek("versi 1 tersimpan", (await teks()).includes("Versi 1 tersimpan"));
await fill("target", "Admin Operasional"); await klik("Simpan perubahan");
await fill("catatan", "Ganti target posisi"); await klik("Simpan sebagai versi baru");
cek("versi 2 tersimpan", (await teks()).includes("Versi 2 tersimpan"));
const v1 = await ambil(`/api/cv/${cvId}/html?versi=1`);
cek("versi 1 tetap utuh", v1.teks.includes("Staf Administrasi") && !v1.teks.includes("Admin Operasional"));
await go(`/cv/${cvId}/versi`);
const vt = await teks();
cek("riwayat memuat v1, v2, dan perubahan", vt.includes("Versi 1") && vt.includes("Versi 2") && /ditambah/.test(vt));
await shot("05-versi");
// pulihkan v1
page.once("dialog", (d) => d.accept());
const pulih = await page.$$(`xpath/.//button[contains(normalize-space(.), "Pulihkan")]`);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), pulih.at(-1).click()]);
cek("pulihkan versi mengembalikan target", (await page.$eval('[name="target"]', (e) => e.value)) === "Staf Administrasi", page.url());

console.log("Pemeriksaan ATS dan lowongan");
const ed = await teks();
cek("pemeriksaan ATS tampil", /pemeriksaan sistem rekrutmen/i.test(ed));
await page.$eval("textarea[aria-label='Teks lowongan']", (el) => { const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(el, "Dicari staf administrasi. Menguasai Excel, pengarsipan, dan korespondensi bisnis. Negosiasi dan korespondensi wajib."); el.dispatchEvent(new Event("input", { bubbles: true })); });
await klik("Cocokkan");
await new Promise((r) => setTimeout(r, 800));
const lw = await teks();
cek("kecocokan lowongan menampilkan kata kunci", /kata kunci sudah ada/.test(lw) && lw.includes("korespondensi"));

console.log("Order, dasbor");
await go(`/order/baru?klien=${id}`);
await fill("judul", "CV baru untuk melamar bank"); await fill("harga", "150000"); await fill("deadline", "2099-01-01");
await klik("Buat order");
const orderId = pecah(page.url())[1];
cek("order terbentuk", pecah(page.url())[0] === "order" && orderId?.length === 36, page.url());
await fill("status", "revisi"); await fill("dibayar", "50000");
await klik("Simpan order");
await go("/");
const dash = await teks();
cek("dasbor menghitung order dan piutang", dash.includes("Order berjalan") && dash.includes("Rp100.000"), dash.slice(0, 200));
await shot("06-dasbor-isi");

console.log("Tautan isi data (tamu) dan akun klien");
await go(`/klien/${id}/kelola`);
await klik("Buat tautan baru");
const link = await page.$eval(".ok", (e) => e.textContent);
cek("tautan isi data dibuat", /\/isi\/[\w-]{20,}/.test(link), link);
const tamuPage = await (await browser.createBrowserContext()).newPage();
await tamuPage.setViewport({ width: 1100, height: 800 });
await tamuPage.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle0" });
cek("tamu masuk ke hub klien", tamuPage.url().includes(`/klien/${id}`) && (await tamuPage.evaluate(() => document.body.innerText)).includes("tautan khusus"));
await tamuPage.goto(`${BASE}/cv/${cvId}`, { waitUntil: "networkidle0" });
cek("tamu tidak bisa membuka CV", !tamuPage.url().includes("/cv/"), tamuPage.url());
const r = await tamuPage.evaluate(async (u) => (await fetch(u)).status, `${BASE}/api/cv/${cvId}/pdf`);
cek("tamu tidak bisa mengunduh PDF", r === 404, String(r));
await tamuPage.goto(`${BASE}/klien`, { waitUntil: "networkidle0" });
cek("tamu tidak bisa membuka daftar klien", !tamuPage.url().endsWith("/klien"), tamuPage.url());
await tamuPage.close();

await go(`/klien/${id}/kelola`);
await fill("email", "sari.uji@contoh.id"); await fill("password", "uji-password-1");
await klik("Buat akun");
cek("akun klien dibuat", (await teks()).includes("Klien masuk dengan"));

console.log("Masuk sebagai klien");
const kctx = await browser.createBrowserContext();
const kp = await kctx.newPage();
await kp.setViewport({ width: 1100, height: 800 });
await kp.goto(BASE + "/masuk", { waitUntil: "networkidle0" });
await kp.$eval('[name="email"]', (e) => (e.value = "sari.uji@contoh.id"));
await kp.$eval('[name="password"]', (e) => (e.value = "uji-password-1"));
await Promise.all([kp.waitForNavigation({ waitUntil: "networkidle0" }), kp.click('button[type="submit"]')]);
await kp.waitForFunction(() => location.pathname.startsWith("/klien/"), { timeout: 10000 }).catch(() => {});
cek("klien diarahkan ke hubnya", kp.url().includes(`/klien/${id}`), kp.url());
await kp.goto(BASE + "/pengaturan", { waitUntil: "networkidle0" });
cek("klien tidak bisa membuka pengaturan admin", !kp.url().includes("/pengaturan"), kp.url());
const lain = await kp.evaluate(async (u) => (await fetch(u)).status, `${BASE}/api/cv/00000000-0000-0000-0000-000000000000/pdf`);
cek("klien tidak bisa mengunduh CV yang bukan miliknya", lain === 404);
await kp.goto(`${BASE}/cv/${cvId}`, { waitUntil: "networkidle0" });
cek("klien dapat membuka CV sendiri", (await kp.evaluate(() => document.body.innerText)).includes("Pengaturan CV"));
await kp.screenshot({ path: "shots/07-klien-editor.png" });
await kp.setViewport({ width: 390, height: 844, isMobile: true });
await kp.goto(`${BASE}/klien/${id}`, { waitUntil: "networkidle0" });
await kp.screenshot({ path: "shots/08-klien-hp.png" });
await kp.goto(`${BASE}/cv/${cvId}`, { waitUntil: "networkidle0" });
await kp.screenshot({ path: "shots/09-editor-hp-full.png", fullPage: true });
await kctx.close();

console.log("Bersih-bersih");
await go(`/klien/${id}/kelola`);
page.once("dialog", (d) => d.accept());
const hapus = await page.$$(`xpath/.//button[contains(normalize-space(.), "Hapus klien")]`);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), hapus[0].click()]);
cek("klien uji dihapus", page.url().endsWith("/klien"));

cek("tidak ada galat di konsol", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(`\nSemua ${ok} pemeriksaan lulus.`);
