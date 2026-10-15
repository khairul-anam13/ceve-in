"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientOf, requireAccess } from "@/lib/auth";
import { cocokkanLowongan } from "@/lib/ats";
import { buildCvData } from "@/lib/cv";
import { isTemplate, TIPE, type CvData, type Tipe } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { bool, str } from "@/lib/form-data";
import type { FormState } from "@/lib/form";

export type HasilCek = { ada: string[]; belum: string[]; persen: number };

/** Akses ke CV lewat id-nya: cari klien pemiliknya dulu, lalu periksa hak aksesnya. */
async function aksesCv(cvId: string) {
  const clientId = await clientOf("cvs", cvId);
  if (!clientId) redirect("/");
  const actor = await requireAccess(clientId, "cv");
  return { clientId, actor };
}

/** Klien (bukan admin) dibatasi kuota jumlah CV bila `kuota_cv` diisi. */
async function kuotaPenuh(clientId: string, actor: { kind: string }): Promise<boolean> {
  if (actor.kind === "admin") return false;
  const [r] = await sql`select c.kuota_cv, (select count(*)::int from cvs where client_id = c.id) as n from clients c where c.id = ${clientId}`;
  return r?.kuota_cv != null && r.n >= r.kuota_cv;
}

export async function buatCv(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireAccess(clientId, "cv");
  if (await kuotaPenuh(clientId, actor)) return { error: "Jumlah CV sudah mencapai batas akun ini. Hubungi penyedia jasa untuk menambah." };
  const [cfg] = await sql`select template_default from settings where id = 1`;
  const tpl = str(fd, "template");
  const template = isTemplate(tpl) ? tpl : cfg.template_default;
  const label = str(fd, "label", 80) || "CV";
  const id = await sql.begin(async (tx) => {
    const [c] = await tx`insert into cvs (client_id, label, target_posisi, template) values (${clientId}, ${label}, ${str(fd, "target", 120)}, ${template}) returning id`;
    await tx`insert into cv_entries (cv_id, entry_id) select ${c.id}, id from entries where client_id = ${clientId}`;
    return c.id as string;
  });
  redirect(`/cv/${id}`);
}

export async function simpanCv(cvId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { clientId } = await aksesCv(cvId);
  const tpl = str(fd, "template");
  if (!isTemplate(tpl)) return { error: "Template tidak dikenal." };
  const dulu = str(fd, "dulu");
  const urutan = dulu === "pendidikan" || dulu === "kerja" ? [dulu] : null;
  const ringkasan = str(fd, "ringkasan", 1200);
  const dipilih = fd.getAll("pilih").map(String);

  await sql.begin(async (tx) => {
    await tx`update cvs set label = ${str(fd, "label", 80) || "CV"}, target_posisi = ${str(fd, "target", 120)}, template = ${tpl},
      pakai_foto = ${bool(fd, "pakai_foto")}, pakai_data_pribadi = ${bool(fd, "pakai_data_pribadi")},
      ringkasan_override = ${ringkasan || null}, urutan_bagian = ${urutan ? tx.json(urutan) : null}, updated_at = now()
      where id = ${cvId}`;
    // Entry yang dipilih saja, dan hanya milik klien ini.
    const milik = await tx`select id, butir from entries where client_id = ${clientId}`;
    await tx`delete from cv_entries where cv_id = ${cvId}`;
    for (const e of milik) {
      if (!dipilih.includes(e.id)) continue;
      const teks = fd.get(`butir_${e.id}`);
      const baris = typeof teks === "string" ? teks.split(/\r?\n/).map((s) => s.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean).slice(0, 30) : null;
      const asli = e.butir as string[];
      const sama = !baris || (baris.length === asli.length && baris.every((b, i) => b === asli[i]));
      await tx`insert into cv_entries (cv_id, entry_id, butir_override) values (${cvId}, ${e.id}, ${sama ? null : tx.json(baris)})`;
    }
  });
  revalidatePath(`/cv/${cvId}`);
  return { ok: "Tersimpan." };
}

export async function simpanVersi(cvId: string, _: FormState, fd: FormData): Promise<FormState> {
  await aksesCv(cvId);
  const data = await buildCvData(cvId);
  if (!data) return { error: "CV tidak ditemukan." };
  const [v] = await sql`
    insert into versions (cv_id, nomor, snapshot, catatan)
    select ${cvId}, coalesce(max(nomor), 0) + 1, ${sql.json(data as never)}, ${str(fd, "catatan", 300)} from versions where cv_id = ${cvId}
    returning nomor`;
  revalidatePath(`/cv/${cvId}`);
  return { ok: `Versi ${v.nomor} tersimpan.` };
}

export async function duplikatCv(cvId: string) {
  const { clientId, actor } = await aksesCv(cvId);
  if (await kuotaPenuh(clientId, actor)) redirect(`/cv/${cvId}?kuota=1`);
  const id = await sql.begin(async (tx) => {
    const [c] = await tx`insert into cvs (client_id, label, target_posisi, template, pakai_foto, pakai_data_pribadi, ringkasan_override, urutan_bagian)
      select client_id, label || ' (salinan)', target_posisi, template, pakai_foto, pakai_data_pribadi, ringkasan_override, urutan_bagian from cvs where id = ${cvId}
      returning id`;
    await tx`insert into cv_entries (cv_id, entry_id, butir_override) select ${c.id}, entry_id, butir_override from cv_entries where cv_id = ${cvId}`;
    return c.id as string;
  });
  redirect(`/cv/${id}`);
}

export async function hapusCv(cvId: string) {
  const { clientId } = await aksesCv(cvId);
  await sql`delete from cvs where id = ${cvId}`;
  redirect(`/klien/${clientId}`);
}

/** Kembalikan pengaturan dan pilihan entry CV ke isi sebuah versi. Entry yang sudah dihapus dilewati. */
export async function pulihkanVersi(cvId: string, nomor: number) {
  const { clientId } = await aksesCv(cvId);
  const [v] = await sql`select snapshot from versions where cv_id = ${cvId} and nomor = ${nomor}`;
  if (!v) redirect(`/cv/${cvId}/versi`);
  const s = v.snapshot as CvData;
  const urutan = (s.pengaturan.urutanBagian ?? null) as Tipe[] | null;
  await sql.begin(async (tx) => {
    await tx`update cvs set label = ${s.pengaturan.label}, target_posisi = ${s.target}, template = ${s.template},
      pakai_foto = ${s.pengaturan.pakaiFoto}, pakai_data_pribadi = ${s.pengaturan.pakaiDataPribadi},
      ringkasan_override = ${s.pengaturan.ringkasanOverride}, urutan_bagian = ${urutan?.length ? tx.json(urutan) : null}, updated_at = now()
      where id = ${cvId}`;
    await tx`delete from cv_entries where cv_id = ${cvId}`;
    const hidup = new Set((await tx`select id from entries where client_id = ${clientId}`).map((r) => r.id as string));
    for (const b of s.bagian) {
      if (!(TIPE as readonly string[]).includes(b.tipe)) continue;
      for (const it of b.items) {
        if (!hidup.has(it.entryId)) continue;
        await tx`insert into cv_entries (cv_id, entry_id, butir_override) values (${cvId}, ${it.entryId}, ${tx.json(it.butir)})
          on conflict do nothing`;
      }
    }
  });
  redirect(`/cv/${cvId}?pulih=${nomor}`);
}

/** Cocokkan kata kunci lowongan dengan CV (keadaan sekarang). */
export async function cekLowongan(cvId: string, teks: string): Promise<HasilCek> {
  await aksesCv(cvId);
  const d = await buildCvData(cvId);
  if (!d) return { ada: [], belum: [], persen: 0 };
  return cocokkanLowongan(d, teks.slice(0, 8000));
}
