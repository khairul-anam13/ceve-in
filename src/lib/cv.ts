import "server-only";
import { sql } from "./db";
import { tanggalPanjang } from "./format";
import { urutanBagian, type CvData, type Item, type Tipe } from "./cv-types";

/** Susun data CV dari profil + entry yang dipilih. Versi lama: pakai snapshot langsung, jangan panggil ini. */
export async function buildCvData(cvId: string): Promise<CvData | null> {
  const [c] = await sql`select id, client_id, label, target_posisi, template, pakai_foto, pakai_data_pribadi, ringkasan_override, urutan_bagian from cvs where id = ${cvId}`;
  if (!c) return null;
  const [p] = await sql`select nama_lengkap, tempat_lahir, tgl_lahir::text as tgl_lahir, alamat, kota, hp, email, linkedin, (foto_data is not null) as foto, ringkasan, status_nikah, agama, tinggi, berat from profiles where client_id = ${c.client_id}`;
  const [cl] = await sql`select nama from clients where id = ${c.client_id}`;
  const rows = await sql`
    select e.id, e.tipe, e.judul, e.instansi, e.lokasi, e.mulai::text as mulai, e.selesai::text as selesai, e.berjalan, e.butir, e.deskripsi, ce.butir_override
    from cv_entries ce join entries e on e.id = ce.entry_id
    where ce.cv_id = ${cvId} order by e.urutan, e.id`;

  const per = new Map<Tipe, Item[]>();
  for (const r of rows) {
    const item: Item = {
      entryId: r.id, judul: r.judul, instansi: r.instansi, lokasi: r.lokasi, mulai: r.mulai, selesai: r.selesai,
      berjalan: r.berjalan, butir: (r.butir_override ?? r.butir) as string[], deskripsi: r.deskripsi,
    };
    per.set(r.tipe, [...(per.get(r.tipe as Tipe) ?? []), item]);
  }
  const khusus = (c.urutan_bagian as Tipe[] | null) ?? null;
  const bagian = urutanBagian(c.template, khusus).filter((t) => per.has(t)).map((tipe) => ({ tipe, items: per.get(tipe)! }));

  const pribadi: CvData["pribadi"] = [];
  if (c.pakai_data_pribadi && p) {
    const ttl = [p.tempat_lahir, tanggalPanjang(p.tgl_lahir)].filter(Boolean).join(", ");
    if (ttl) pribadi.push({ label: "Tempat, tanggal lahir", nilai: ttl });
    if (p.status_nikah) pribadi.push({ label: "Status", nilai: p.status_nikah });
    if (p.agama) pribadi.push({ label: "Agama", nilai: p.agama });
    if (p.tinggi || p.berat) pribadi.push({ label: "Tinggi / berat", nilai: `${p.tinggi ?? "-"} cm / ${p.berat ?? "-"} kg` });
  }

  return {
    clientId: c.client_id,
    nama: p?.nama_lengkap || cl?.nama || "",
    target: c.target_posisi,
    kontak: { hp: p?.hp ?? "", email: p?.email ?? "", alamat: p?.alamat ?? "", kota: p?.kota ?? "", linkedin: p?.linkedin ?? "" },
    foto: !!(c.pakai_foto && p?.foto),
    ringkasan: c.ringkasan_override ?? p?.ringkasan ?? "",
    pribadi,
    template: c.template,
    bagian,
    pengaturan: { label: c.label, pakaiFoto: c.pakai_foto, pakaiDataPribadi: c.pakai_data_pribadi, ringkasanOverride: c.ringkasan_override, urutanBagian: khusus },
  };
}

/** Data untuk dirender: versi tersimpan (snapshot) bila nomor diberikan, selain itu keadaan CV sekarang. */
export async function loadCvData(cvId: string, versi?: number | null): Promise<CvData | null> {
  if (versi) {
    const [v] = await sql`select snapshot from versions where cv_id = ${cvId} and nomor = ${versi}`;
    return v ? (v.snapshot as CvData) : null;
  }
  return buildCvData(cvId);
}

/** Foto klien sebagai data URL (untuk dimasukkan ke HTML/PDF), atau null. */
export async function loadFoto(clientId: string): Promise<string | null> {
  const [p] = await sql`select foto_data, foto_tipe from profiles where client_id = ${clientId}`;
  if (!p?.foto_data) return null;
  return `data:${p.foto_tipe ?? "image/jpeg"};base64,${Buffer.from(p.foto_data).toString("base64")}`;
}
