import postgres from "postgres";

const url = process.env.DATABASE_URL;
// Gagal cepat dengan pesan jelas. Tanpa ini, postgres.js diam-diam memakai 127.0.0.1:5432 dan error baru muncul saat halaman dibuka.
if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("DATABASE_URL belum diisi. Lokal: .env.local. Vercel: Project → Settings → Environment Variables.");
}
const lokal = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url ?? "");

// Satu koneksi per proses (aman untuk hot-reload dev). prepare:false → kompatibel dengan pooler transaksi Supabase.
// Di Vercel setiap instans fungsi cukup 1 koneksi; pooler yang membagi ke database.
const g = globalThis as unknown as { __ceveSql?: postgres.Sql };
export const sql = (g.__ceveSql ??= postgres(url ?? "", {
  prepare: false,
  max: process.env.VERCEL ? 1 : 5,
  idle_timeout: 20,
  ssl: lokal ? false : "require",
  onnotice: () => {},
}));
export type Sql = postgres.Sql;
