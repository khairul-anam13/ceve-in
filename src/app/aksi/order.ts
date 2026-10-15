"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin } from "@/lib/auth";
import { isTemplate } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { angka, bool, str, tgl } from "@/lib/form-data";
import type { FormState } from "@/lib/form";
import { hashPassword } from "@/lib/password";

const JENIS = ["baru", "update", "varian", "lain"];
const STATUS = ["baru", "data", "draf", "revisi", "selesai", "batal"];
const UUID = /^[0-9a-f-]{36}$/i;

/** Admin membuat order untuk klien. Harga bebas, ditentukan admin. */
export async function buatOrder(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const jenis = JENIS.includes(str(fd, "jenis")) ? str(fd, "jenis") : "baru";
  const cv = str(fd, "cv_id");
  const [o] = await sql`insert into orders (client_id, cv_id, jenis, judul, deadline, harga, batas_revisi, catatan)
    values (${clientId}, ${UUID.test(cv) ? cv : null}, ${jenis}, ${str(fd, "judul", 160)}, ${tgl(fd, "deadline")}, ${angka(fd, "harga") ?? 0}, ${angka(fd, "batas_revisi") ?? 2}, ${str(fd, "catatan", 2000)})
    returning id`;
  redirect(`/order/${o.id}`);
}

/** Klien meminta perubahan atau CV baru lewat portal: masuk sebagai order berstatus "baru". */
export async function mintaPerubahan(clientId: string, _: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireAccess(clientId, "cv");
  if (actor.kind === "admin") return { error: "Admin membuat order dari halaman Order." };
  const teks = str(fd, "catatan", 2000);
  if (teks.length < 5) return { error: "Tuliskan perubahan yang Anda butuhkan." };
  await sql`insert into orders (client_id, jenis, judul, catatan) values (${clientId}, 'update', 'Permintaan dari klien', ${teks})`;
  revalidatePath(`/klien/${clientId}`);
  return { ok: "Permintaan terkirim. Anda akan dihubungi." };
}

export async function simpanOrder(orderId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const status = STATUS.includes(str(fd, "status")) ? str(fd, "status") : "baru";
  const jenis = JENIS.includes(str(fd, "jenis")) ? str(fd, "jenis") : "baru";
  const cv = str(fd, "cv_id");
  const harga = angka(fd, "harga") ?? 0;
  const dibayar = angka(fd, "dibayar") ?? 0;
  const [lama] = await sql`select status, revisi_ke from orders where id = ${orderId}`;
  if (!lama) return { error: "Order tidak ditemukan." };
  // Masuk ke status "revisi" dihitung sebagai satu putaran revisi.
  const revisi = status === "revisi" && lama.status !== "revisi" ? lama.revisi_ke + 1 : (angka(fd, "revisi_ke") ?? lama.revisi_ke);
  await sql`update orders set status = ${status}, jenis = ${jenis}, judul = ${str(fd, "judul", 160)}, cv_id = ${UUID.test(cv) ? cv : null},
    deadline = ${tgl(fd, "deadline")}, harga = ${harga}, dibayar = ${dibayar}, batas_revisi = ${angka(fd, "batas_revisi") ?? 2}, revisi_ke = ${revisi},
    catatan = ${str(fd, "catatan", 2000)},
    selesai_at = case when ${status} = 'selesai' then coalesce(selesai_at, now()) else null end
    where id = ${orderId}`;
  // Order selesai: jadwalkan pengingat follow-up 6 bulan lagi bila belum ada.
  if (status === "selesai" && lama.status !== "selesai") {
    await sql`update clients set ingatkan_at = coalesce(ingatkan_at, (now() + interval '6 months')::date)
      where id = (select client_id from orders where id = ${orderId})`;
  }
  revalidatePath(`/order/${orderId}`);
  return { ok: "Tersimpan." };
}

export async function hapusOrder(orderId: string) {
  await requireAdmin();
  await sql`delete from orders where id = ${orderId}`;
  redirect("/order");
}

/* ---------- Pengaturan ---------- */

export async function simpanPengaturan(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const tpl = str(fd, "template_default");
  await sql`update settings set nama_jasa = ${str(fd, "nama_jasa", 80) || "CEVE-IN"}, kontak = ${str(fd, "kontak", 200)},
    daftar_terbuka = ${bool(fd, "daftar_terbuka")}, kuota_mandiri = ${angka(fd, "kuota_mandiri") ?? 1},
    template_default = ${isTemplate(tpl) ? tpl : "klasik"} where id = 1`;
  revalidatePath("/pengaturan");
  return { ok: "Pengaturan tersimpan." };
}

export async function gantiPassword(_: FormState, fd: FormData): Promise<FormState> {
  const a = await requireAdmin();
  const baru = String(fd.get("baru") ?? "");
  if (baru.length < 8) return { error: "Password baru minimal 8 karakter." };
  if (baru !== String(fd.get("ulang") ?? "")) return { error: "Pengulangan password tidak sama." };
  await sql`update users set password_hash = ${await hashPassword(baru)} where id = ${a.userId}`;
  return { ok: "Password diganti." };
}
