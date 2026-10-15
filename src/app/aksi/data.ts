"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { newIntakeLink, requireAccess, requireAdmin } from "@/lib/auth";
import { FIELD, TIPE, type Tipe } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { angka, baris, bool, emailValid, str, tgl } from "@/lib/form-data";
import type { FormState } from "@/lib/form";
import { hashPassword } from "@/lib/password";

const UUID = /^[0-9a-f-]{36}$/i;

/* ---------- Klien ---------- */

export async function buatKlien(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const nama = str(fd, "nama", 120);
  if (nama.length < 2) return { error: "Isi nama klien." };
  const hp = str(fd, "hp", 40);
  const email = str(fd, "email", 200).toLowerCase();
  if (email && !emailValid(email)) return { error: "Email tidak valid." };
  const id = await sql.begin(async (tx) => {
    const [c] = await tx`insert into clients (nama, hp, email, setuju_at) values (${nama}, ${hp}, ${email}, ${bool(fd, "setuju") ? new Date() : null}) returning id`;
    await tx`insert into profiles (client_id, nama_lengkap, hp, email) values (${c.id}, ${nama}, ${hp}, ${email})`;
    return c.id as string;
  });
  redirect(`/klien/${id}`);
}

export async function simpanKelola(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const status = str(fd, "status") === "arsip" ? "arsip" : "aktif";
  await sql`update clients set
    catatan = ${str(fd, "catatan", 4000)}, status = ${status}, ingatkan_at = ${tgl(fd, "ingatkan_at")}, kuota_cv = ${angka(fd, "kuota_cv")},
    setuju_at = case when ${bool(fd, "setuju")} then coalesce(setuju_at, now()) else null end
    where id = ${clientId}`;
  revalidatePath(`/klien/${clientId}`);
  return { ok: "Tersimpan." };
}

export async function buatTautanIsi(clientId: string, _: FormState, __: FormData): Promise<FormState> {
  await requireAdmin();
  const token = await newIntakeLink(clientId, 7);
  const h = await headers();
  const host = h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { ok: `${proto}://${host}/isi/${token}` };
}

/** Beri klien yang dikelola admin sebuah akun login (jalur klien masuk sendiri). */
export async function buatAkun(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const email = str(fd, "email", 200).toLowerCase();
  const pw = String(fd.get("password") ?? "");
  if (!emailValid(email)) return { error: "Email tidak valid." };
  if (pw.length < 8) return { error: "Password minimal 8 karakter." };
  const [ada] = await sql`select 1 from users where email = ${email}`;
  if (ada) return { error: "Email ini sudah dipakai akun lain." };
  const [c] = await sql`select nama, user_id from clients where id = ${clientId}`;
  if (!c) return { error: "Klien tidak ditemukan." };
  if (c.user_id) return { error: "Klien ini sudah punya akun." };
  const hash = await hashPassword(pw);
  await sql.begin(async (tx) => {
    const [u] = await tx`insert into users (email, name, role, password_hash) values (${email}, ${c.nama}, 'klien', ${hash}) returning id`;
    await tx`update clients set user_id = ${u.id} where id = ${clientId}`;
  });
  revalidatePath(`/klien/${clientId}/kelola`);
  return { ok: `Akun dibuat untuk ${email}.` };
}

export async function hapusKlien(clientId: string) {
  await requireAdmin();
  const [c] = await sql`select user_id from clients where id = ${clientId}`;
  await sql`delete from clients where id = ${clientId}`;
  if (c?.user_id) await sql`delete from users where id = ${c.user_id}`;
  redirect("/klien");
}

/* ---------- Profil + foto ---------- */

export async function simpanProfil(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAccess(clientId, "data");
  const nama = str(fd, "nama_lengkap", 120);
  if (nama.length < 2) return { error: "Isi nama lengkap." };
  const email = str(fd, "email", 200);
  if (email && !emailValid(email)) return { error: "Email tidak valid." };
  const hp = str(fd, "hp", 40);
  await sql`update profiles set
    nama_lengkap = ${nama}, tempat_lahir = ${str(fd, "tempat_lahir", 80)}, tgl_lahir = ${tgl(fd, "tgl_lahir")},
    alamat = ${str(fd, "alamat", 300)}, kota = ${str(fd, "kota", 80)}, hp = ${hp}, email = ${email},
    linkedin = ${str(fd, "linkedin", 200)}, ringkasan = ${str(fd, "ringkasan", 1200)},
    status_nikah = ${str(fd, "status_nikah", 40)}, agama = ${str(fd, "agama", 40)},
    tinggi = ${angka(fd, "tinggi")}, berat = ${angka(fd, "berat")}, updated_at = now()
    where client_id = ${clientId}`;
  await sql`update clients set nama = ${nama}, hp = ${hp}, email = ${email} where id = ${clientId}`;
  revalidatePath(`/klien/${clientId}`);
  return { ok: "Biodata tersimpan." };
}

function jenisGambar(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** Foto biasanya sudah dikecilkan di browser (~100 KB). Batas ini hanya jaring pengaman. */
const FOTO_MAKS = 1.5 * 1024 * 1024;

export async function unggahFoto(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAccess(clientId, "data");
  const f = fd.get("foto");
  if (!(f instanceof File) || f.size === 0) return { error: "Pilih file foto dulu." };
  if (f.size > FOTO_MAKS) return { error: "Ukuran foto terlalu besar. Pilih foto lain." };
  const buf = Buffer.from(await f.arrayBuffer());
  const tipe = jenisGambar(buf);
  if (!tipe) return { error: "Format harus JPG, PNG, atau WEBP." };
  await sql`update profiles set foto_data = ${buf}, foto_tipe = ${tipe}, updated_at = now() where client_id = ${clientId}`;
  revalidatePath(`/klien/${clientId}`);
  return { ok: "Foto tersimpan." };
}

export async function hapusFoto(clientId: string) {
  await requireAccess(clientId, "data");
  await sql`update profiles set foto_data = null, foto_tipe = null, updated_at = now() where client_id = ${clientId}`;
  revalidatePath(`/klien/${clientId}/profil`);
}

/* ---------- Entry (riwayat) ---------- */

export async function simpanEntry(clientId: string, entryId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAccess(clientId, "data");
  const tipe = str(fd, "tipe") as Tipe;
  if (!TIPE.includes(tipe)) return { error: "Jenis data tidak dikenal." };
  const f = FIELD[tipe];
  const judul = str(fd, "judul", 200);
  if (!judul) return { error: `Isi ${f.judul.toLowerCase()}.` };
  const berjalan = f.tanggal === "rentang" && bool(fd, "berjalan");
  const mulai = f.tanggal === "tidak" ? null : tgl(fd, "mulai");
  const selesai = f.tanggal === "rentang" && !berjalan ? tgl(fd, "selesai") : null;
  if (mulai && selesai && selesai < mulai) return { error: "Tanggal selesai lebih awal dari tanggal mulai." };
  const vals = {
    tipe, judul, instansi: str(fd, "instansi", 200), lokasi: str(fd, "lokasi", 120), mulai, selesai, berjalan,
    butir: f.butir ? baris(fd, "butir") : [], deskripsi: str(fd, "deskripsi", 600),
  };
  if (entryId === "baru") {
    const [u] = await sql`select ${f.baruDiAtas ? sql`coalesce(min(urutan), 0) - 1` : sql`coalesce(max(urutan), 0) + 1`} as n from entries where client_id = ${clientId} and tipe = ${tipe}`;
    await sql`insert into entries (client_id, tipe, judul, instansi, lokasi, mulai, selesai, berjalan, butir, deskripsi, urutan)
      values (${clientId}, ${vals.tipe}, ${vals.judul}, ${vals.instansi}, ${vals.lokasi}, ${vals.mulai}, ${vals.selesai}, ${vals.berjalan}, ${sql.json(vals.butir)}, ${vals.deskripsi}, ${u.n})`;
  } else {
    if (!UUID.test(entryId)) return { error: "Data tidak ditemukan." };
    const r = await sql`update entries set tipe = ${vals.tipe}, judul = ${vals.judul}, instansi = ${vals.instansi}, lokasi = ${vals.lokasi},
      mulai = ${vals.mulai}, selesai = ${vals.selesai}, berjalan = ${vals.berjalan}, butir = ${sql.json(vals.butir)}, deskripsi = ${vals.deskripsi}, updated_at = now()
      where id = ${entryId} and client_id = ${clientId} returning id`;
    if (!r.length) return { error: "Data tidak ditemukan." };
  }
  revalidatePath(`/klien/${clientId}`);
  redirect(`/klien/${clientId}`);
}

export async function hapusEntry(clientId: string, entryId: string) {
  await requireAccess(clientId, "data");
  await sql`delete from entries where id = ${entryId} and client_id = ${clientId}`;
  redirect(`/klien/${clientId}`);
}

/** Geser satu langkah ke atas/bawah di antara entry sejenis. */
export async function geserEntry(clientId: string, entryId: string, arah: "naik" | "turun") {
  await requireAccess(clientId, "data");
  const rows = await sql`select id, urutan, tipe from entries where client_id = ${clientId}
    and tipe = (select tipe from entries where id = ${entryId} and client_id = ${clientId}) order by urutan, id`;
  const i = rows.findIndex((r) => r.id === entryId);
  const j = arah === "naik" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  // Tukar posisi lewat nomor urut baru yang berurutan, supaya tetap benar walau ada nilai urutan kembar.
  const order = rows.map((r) => r.id as string);
  [order[i], order[j]] = [order[j], order[i]];
  await sql.begin(async (tx) => {
    for (let k = 0; k < order.length; k++) await tx`update entries set urutan = ${k} where id = ${order[k]}`;
  });
  revalidatePath(`/klien/${clientId}`);
}
