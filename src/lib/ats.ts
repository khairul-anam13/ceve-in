// Pemeriksaan CV tanpa AI: aturan tetap + pencocokan kata kunci dengan teks lowongan.
import { barisTeks, FIELD, type CvData } from "./cv-types.ts";

export type Temuan = { tingkat: "peringatan" | "saran"; teks: string };

export function periksaCv(d: CvData): Temuan[] {
  const t: Temuan[] = [];
  const w = (teks: string) => t.push({ tingkat: "peringatan", teks });
  const s = (teks: string) => t.push({ tingkat: "saran", teks });

  if (!d.nama) w("Nama kosong.");
  if (!d.kontak.hp && !d.kontak.email) w("Tidak ada nomor HP atau email. Rekruter tidak bisa menghubungi.");
  else {
    if (!d.kontak.email) s("Tambahkan email. Banyak sistem rekrutmen memakainya sebagai identitas.");
    if (!d.kontak.hp) s("Tambahkan nomor HP.");
  }
  if (!d.target) s("Isi target posisi supaya CV terasa terarah ke satu lowongan.");
  if (!d.ringkasan) s("Tambahkan ringkasan profil 2–3 kalimat.");
  if (!d.bagian.some((b) => b.tipe === "pendidikan")) w("Tidak ada riwayat pendidikan.");
  if (!d.bagian.some((b) => b.tipe === "skill")) s("Tambahkan bagian keahlian. Kata kunci lowongan sering dicocokkan di sini.");
  if (d.foto) s("Foto aktif. Sistem rekrutmen luar negeri dan sebagian ATS menolak foto. Matikan untuk lamaran lewat portal online.");
  if (d.pribadi.length) s("Data pribadi (status, agama, tinggi/berat) aktif. Pakai hanya bila lowongan memintanya.");

  let butirPanjang = 0;
  let totalBaris = 0;
  for (const b of d.bagian) {
    for (const it of b.items) {
      const f = FIELD[b.tipe];
      if (f.tanggal === "rentang" && !it.mulai && !it.selesai && !/\b(19|20)\d{2}\b/.test(it.deskripsi)) w(`"${it.judul || "(tanpa judul)"}" belum punya tanggal atau tahun.`);
      if (b.tipe === "kerja" && !it.butir.length) s(`"${it.judul}" belum punya poin pencapaian.`);
      for (const x of it.butir) {
        totalBaris += Math.ceil(x.length / 95);
        if (x.length > 190) butirPanjang++;
      }
      totalBaris += 2;
    }
    totalBaris += 2;
  }
  if (butirPanjang) s(`${butirPanjang} poin lebih dari 2 baris. Pendekkan supaya mudah dipindai.`);
  if (totalBaris > 95) s("CV kemungkinan lebih dari 2 halaman. Pilih entry yang paling relevan atau pakai template Ringkas.");
  return t;
}

const STOP = new Set(
  ("dan atau yang di ke dari untuk dengan pada dalam akan oleh juga serta sebagai adalah ini itu agar bisa dapat sesuai memiliki minimal maksimal " +
    "lebih tidak ada para kami kita anda mampu mau lain seperti atas bagi antara terhadap secara tentang " +
    "the and for with you your are our will have has from that this their must can able work working years year experience " +
    "of to in a an on at as be by or is it we they not all any more most").split(/\s+/),
);

const kata = (teks: string) =>
  teks.toLowerCase().split(/[^a-z0-9+#.]+/).map((k) => k.replace(/^\.+|\.+$/g, "")).filter((k) => k.length >= 3 && !STOP.has(k) && !/^\d+$/.test(k));

/** Kata kunci terpenting dari teks lowongan dan seberapa banyak yang sudah ada di CV. */
export function cocokkanLowongan(d: CvData, lowongan: string, batas = 25) {
  const hitung = new Map<string, number>();
  for (const k of kata(lowongan)) hitung.set(k, (hitung.get(k) ?? 0) + 1);
  const kunci = [...hitung.entries()].sort((a, b) => b[1] - a[1]).slice(0, batas).map(([k]) => k);
  const cv = new Set(kata(barisTeks(d).join(" ")));
  const ada = kunci.filter((k) => cv.has(k));
  const belum = kunci.filter((k) => !cv.has(k));
  return { ada, belum, persen: kunci.length ? Math.round((ada.length / kunci.length) * 100) : 0 };
}
