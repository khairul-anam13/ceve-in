// Pembaca FormData untuk server action.
export const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
export const bool = (fd: FormData, k: string) => fd.get(k) === "on";

export function angka(fd: FormData, k: string): number | null {
  const v = str(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : null;
}

/** Input type="month" (YYYY-MM) atau type="date" → "YYYY-MM-DD" untuk kolom date; kosong/salah → null. */
export function tgl(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Textarea satu poin per baris → string[] (awalan "-" atau "•" dibuang). */
export const baris = (fd: FormData, k: string, maks = 30): string[] =>
  String(fd.get(k) ?? "").split(/\r?\n/).map((s) => s.replace(/^\s*[-•*]\s*/, "").trim().slice(0, 400)).filter(Boolean).slice(0, maks);

export const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
