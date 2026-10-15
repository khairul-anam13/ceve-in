// Tipe dan konstanta CV — tanpa akses database, aman dipakai di server, client, dan test.

export const TIPE = ["kerja", "magang", "pendidikan", "skill", "sertifikat", "organisasi", "proyek", "bahasa", "penghargaan"] as const;
export type Tipe = (typeof TIPE)[number];

/** Nama bagian di aplikasi. */
export const TIPE_LABEL: Record<Tipe, string> = {
  kerja: "Pengalaman kerja",
  magang: "Magang",
  pendidikan: "Pendidikan",
  skill: "Keahlian",
  sertifikat: "Sertifikat",
  organisasi: "Organisasi",
  proyek: "Proyek",
  bahasa: "Bahasa",
  penghargaan: "Penghargaan",
};

/** Judul bagian di CV: heading baku yang dikenali ATS. */
export const HEADING: Record<Tipe, string> = {
  kerja: "Pengalaman Kerja",
  magang: "Pengalaman Magang",
  pendidikan: "Pendidikan",
  skill: "Keahlian",
  sertifikat: "Sertifikasi",
  organisasi: "Pengalaman Organisasi",
  proyek: "Proyek",
  bahasa: "Bahasa",
  penghargaan: "Penghargaan",
};

/** Isian per jenis bagian: label kolom judul/instansi/deskripsi dan apakah ada tanggal & butir. */
export const FIELD: Record<Tipe, { judul: string; instansi: string; deskripsi: string; tanggal: "rentang" | "satu" | "tidak"; butir: boolean; baruDiAtas: boolean }> = {
  kerja: { judul: "Jabatan", instansi: "Perusahaan", deskripsi: "Ringkasan peran (opsional)", tanggal: "rentang", butir: true, baruDiAtas: true },
  magang: { judul: "Posisi / bidang", instansi: "Tempat magang", deskripsi: "Keterangan (opsional)", tanggal: "rentang", butir: true, baruDiAtas: true },
  pendidikan: { judul: "Jurusan / gelar", instansi: "Sekolah / kampus", deskripsi: "IPK atau keterangan", tanggal: "rentang", butir: true, baruDiAtas: true },
  skill: { judul: "Nama keahlian", instansi: "", deskripsi: "Tingkat (mis. Mahir)", tanggal: "tidak", butir: false, baruDiAtas: false },
  sertifikat: { judul: "Nama sertifikat", instansi: "Penerbit", deskripsi: "Keterangan (opsional)", tanggal: "satu", butir: false, baruDiAtas: true },
  organisasi: { judul: "Jabatan", instansi: "Organisasi", deskripsi: "Ringkasan peran (opsional)", tanggal: "rentang", butir: true, baruDiAtas: true },
  proyek: { judul: "Nama proyek", instansi: "Untuk / klien (opsional)", deskripsi: "Ringkasan (opsional)", tanggal: "rentang", butir: true, baruDiAtas: true },
  bahasa: { judul: "Bahasa", instansi: "", deskripsi: "Tingkat (mis. Aktif)", tanggal: "tidak", butir: false, baruDiAtas: false },
  penghargaan: { judul: "Nama penghargaan", instansi: "Pemberi", deskripsi: "Keterangan (opsional)", tanggal: "satu", butir: false, baruDiAtas: true },
};

export type Item = {
  entryId: string;
  judul: string;
  instansi: string;
  lokasi: string;
  mulai: string | null;
  selesai: string | null;
  berjalan: boolean;
  butir: string[];
  deskripsi: string;
};

export type CvData = {
  clientId: string;
  nama: string;
  target: string;
  kontak: { hp: string; email: string; alamat: string; kota: string; linkedin: string };
  foto: boolean;
  ringkasan: string;
  pribadi: { label: string; nilai: string }[];
  template: string;
  bagian: { tipe: Tipe; items: Item[] }[];
  /** Pengaturan CV saat disimpan — dipakai untuk memulihkan versi. */
  pengaturan: { label: string; pakaiFoto: boolean; pakaiDataPribadi: boolean; ringkasanOverride: string | null; urutanBagian: Tipe[] | null };
};

const URUT_STANDAR: Tipe[] = ["kerja", "magang", "pendidikan", "skill", "sertifikat", "organisasi", "proyek", "bahasa", "penghargaan"];

export const TEMPLATES = {
  klasik: {
    nama: "Klasik",
    deskripsi: "Satu kolom, huruf berkaki. Aman untuk hampir semua sistem rekrutmen.",
    urutan: URUT_STANDAR,
  },
  ringkas: {
    nama: "Ringkas",
    deskripsi: "Huruf tanpa kaki dan rapat, supaya muat satu halaman.",
    urutan: URUT_STANDAR,
  },
  lulusan: {
    nama: "Fresh graduate",
    deskripsi: "Pendidikan, organisasi, dan proyek di atas. Cocok untuk yang belum lama bekerja.",
    urutan: ["pendidikan", "magang", "organisasi", "proyek", "kerja", "skill", "sertifikat", "bahasa", "penghargaan"] as Tipe[],
  },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;
export const isTemplate = (k: string): k is TemplateKey => k in TEMPLATES;

/** Urutan bagian yang berlaku: urutan khusus CV bila ada, selain itu bawaan template. */
export function urutanBagian(template: string, khusus: Tipe[] | null): Tipe[] {
  const dasar = isTemplate(template) ? [...TEMPLATES[template].urutan] : URUT_STANDAR;
  if (!khusus?.length) return dasar;
  const awal = khusus.filter((t) => (TIPE as readonly string[]).includes(t));
  return [...awal, ...dasar.filter((t) => !awal.includes(t))];
}

/** Semua teks CV dalam satu daftar baris — untuk membandingkan versi dan mencocokkan kata kunci. */
export function barisTeks(d: CvData): string[] {
  const out: string[] = [d.nama, d.target, d.ringkasan];
  for (const b of d.bagian) {
    out.push(HEADING[b.tipe]);
    for (const it of b.items) out.push(it.judul, it.instansi, it.lokasi, it.deskripsi, ...it.butir);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}
