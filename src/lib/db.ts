import postgres from "postgres";

// Satu koneksi per proses (aman untuk hot-reload dev). prepare:false → kompatibel dengan pooler.
const g = globalThis as unknown as { __ceveSql?: postgres.Sql };
export const sql = (g.__ceveSql ??= postgres(process.env.DATABASE_URL ?? "", {
  prepare: false, max: 5, idle_timeout: 20, onnotice: () => {},
}));
export type Sql = postgres.Sql;
