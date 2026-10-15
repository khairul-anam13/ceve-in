// Format tampilan — aman dipakai di server maupun client.
export const rupiah = (n: number | string) => "Rp" + Math.round(Number(n)).toLocaleString("id-ID");

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "2024-03-01" → "Mar 2024". */
export function bulanTahun(d?: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(d ?? "");
  return m ? `${BULAN[Number(m[2]) - 1]} ${m[1]}` : "";
}

/** "1998-05-12" → "12 Mei 1998". */
export function tanggalPanjang(d?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? "");
  return m ? `${Number(m[3])} ${BULAN_PENUH[Number(m[2]) - 1]} ${m[1]}` : "";
}

const dt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
export const waktu = (d: Date | string | number) => dt.format(new Date(d)).replace(".", ":");

/** Periode kerja/sekolah: "Jan 2020 – Mar 2023", "Jan 2020 – Sekarang", atau satu tanggal. */
export function periode(mulai?: string | null, selesai?: string | null, berjalan?: boolean): string {
  const a = bulanTahun(mulai);
  const b = berjalan ? "Sekarang" : bulanTahun(selesai);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** Hari ini (WIB) sebagai YYYY-MM-DD. */
export const hariIni = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export const STATUS_ORDER: Record<string, string> = {
  baru: "Baru",
  data: "Data dikumpulkan",
  draf: "Draf dikerjakan",
  revisi: "Revisi",
  selesai: "Selesai",
  batal: "Dibatalkan",
};
export const JENIS_ORDER: Record<string, string> = { baru: "CV baru", update: "Perbarui CV", varian: "Varian lowongan", lain: "Lainnya" };
