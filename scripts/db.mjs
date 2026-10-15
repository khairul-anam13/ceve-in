// Setup database: pnpm db setup | schema | admin | seed | reset --yes
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { hashPassword } from "../src/lib/password.ts";

try { process.loadEnvFile(".env.local"); } catch { /* produksi: env dari platform */ }
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diisi");
const sql = postgres(url, { prepare: false, onnotice: () => {} });

const cmds = {
  schema: () => sql.file("db/schema.sql"),
  async admin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const pw = process.env.ADMIN_PASSWORD;
    if (!email || !pw || pw.length < 8) throw new Error("Isi ADMIN_EMAIL dan ADMIN_PASSWORD (min. 8 karakter)");
    const hash = await hashPassword(pw);
    await sql`insert into users (email, name, role, password_hash) values (${email}, 'Admin', 'admin', ${hash})
              on conflict (email) do update set role = 'admin', password_hash = ${hash}, failed_logins = 0, locked_until = null`;
    console.log(`admin siap: ${email}`);
  },
  /** Data contoh: satu klien lengkap dengan riwayat dan satu CV. Memakai db/seed.json (lokal, tidak masuk git) bila ada, selain itu db/seed.example.json. Dilewati bila klien (email sama) sudah ada. */
  async seed() {
    const d = JSON.parse(readFileSync(existsSync("db/seed.json") ? "db/seed.json" : "db/seed.example.json", "utf8"));
    const [ada] = await sql`select 1 from clients where email = ${d.klien.email}`;
    if (ada) return console.log(`seed dilewati: ${d.klien.nama} sudah ada`);
    await sql.begin(async (tx) => {
      const k = d.klien;
      const [c] = await tx`insert into clients (nama, hp, email) values (${k.nama}, ${k.hp}, ${k.email}) returning id`;
      const p = d.profil;
      await tx`insert into profiles (client_id, nama_lengkap, hp, email, alamat, kota, ringkasan)
               values (${c.id}, ${p.nama_lengkap}, ${p.hp}, ${p.email}, ${p.alamat}, ${p.kota}, ${p.ringkasan})`;
      const cv = d.cv;
      const [v] = await tx`insert into cvs (client_id, label, target_posisi, template) values (${c.id}, ${cv.label}, ${cv.target}, ${cv.template}) returning id`;
      for (const [i, e] of d.entries.entries()) {
        const [r] = await tx`insert into entries (client_id, tipe, judul, instansi, lokasi, mulai, selesai, berjalan, butir, deskripsi, urutan)
          values (${c.id}, ${e.tipe}, ${e.judul}, ${e.instansi ?? ""}, ${e.lokasi ?? ""}, ${e.mulai ?? null}, ${e.selesai ?? null}, ${!!e.berjalan}, ${tx.json(e.butir ?? [])}, ${e.deskripsi ?? ""}, ${i})
          returning id`;
        if (!cv.kecuali?.includes(e.instansi)) await tx`insert into cv_entries (cv_id, entry_id) values (${v.id}, ${r.id})`;
      }
    });
    console.log(`seed selesai: ${d.klien.nama}, ${d.entries.length} riwayat, CV "${d.cv.label}"`);
  },
  async reset() {
    if (!process.argv.includes("--yes")) throw new Error("reset menghapus SEMUA data. Tambahkan --yes untuk melanjutkan");
    await sql`drop schema public cascade`;
    await sql`create schema public`;
    await run(["schema", "admin"]);
  },
  setup: () => run(["schema", "admin"]),
};

async function run(names) {
  for (const n of names) { await cmds[n](); if (n === "schema") console.log("skema siap"); }
}

const cmd = process.argv[2] ?? "setup";
if (!cmds[cmd]) throw new Error(`Perintah tidak dikenal: ${cmd} (setup|schema|admin|seed|reset)`);
try { await cmds[cmd](); } finally { await sql.end(); }
