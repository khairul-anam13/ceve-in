import { notFound } from "next/navigation";
import { buatAkun, buatTautanIsi, hapusKlien, simpanKelola } from "@/app/aksi/data";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { GlassCard, NavigationBar } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Kelola klien" };

export default async function Kelola({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireAdmin();
  const [c] = await sql`
    select c.nama, c.catatan, c.status, c.ingatkan_at::text as ingatkan_at, c.kuota_cv, c.setuju_at, c.user_id, u.email as akun
    from clients c left join users u on u.id = c.user_id where c.id = ${id}`;
  if (!c) notFound();

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title="Kelola klien" backLabel={c.nama} backHref={`/klien/${id}`} />

      <GlassCard eyebrow="Catatan dan pengingat">
        <ActionForm action={simpanKelola.bind(null, id)} submit="Simpan">
          <label><span className="label">Catatan internal (tidak tampil ke klien)</span><textarea className="field" name="catatan" rows={4} defaultValue={c.catatan} /></label>
          <div className="grid-2">
            <label><span className="label">Tanyai kabar pada</span><input className="field" type="date" name="ingatkan_at" defaultValue={c.ingatkan_at ?? ""} /></label>
            <label><span className="label">Batas jumlah CV (kosong = tanpa batas)</span><input className="field" inputMode="numeric" name="kuota_cv" defaultValue={c.kuota_cv ?? ""} /></label>
          </div>
          <label><span className="label">Status</span>
            <select className="field" name="status" defaultValue={c.status}><option value="aktif">Aktif</option><option value="arsip">Arsip</option></select>
          </label>
          <label className="check"><input type="checkbox" name="setuju" defaultChecked={!!c.setuju_at} /><span className="t-sub">Klien sudah menyetujui datanya disimpan</span></label>
        </ActionForm>
      </GlassCard>

      <GlassCard eyebrow="Klien mengisi data sendiri">
        <ActionForm action={buatTautanIsi.bind(null, id)} submit="Buat tautan baru" variant="tinted">
          <p className="t-sub">Kirim tautan lewat WhatsApp. Klien bisa mengisi biodata dan riwayat tanpa akun. Berlaku 7 hari, tautan lama otomatis tidak berlaku.</p>
        </ActionForm>
      </GlassCard>

      <GlassCard eyebrow="Akun masuk klien">
        {c.user_id ? (
          <p className="t-sub">Klien masuk dengan <b>{c.akun}</b>. Klien dapat melihat, mengedit, dan mengunduh CV-nya sendiri.</p>
        ) : (
          <ActionForm action={buatAkun.bind(null, id)} submit="Buat akun" variant="tinted">
            <p className="t-sub">Beri klien akses masuk sendiri untuk memperbarui data dan mengunduh CV.</p>
            <div className="grid-2">
              <label><span className="label">Email</span><input className="field" type="email" name="email" required /></label>
              <label><span className="label">Password awal</span><input className="field" type="text" name="password" minLength={8} required autoComplete="off" /></label>
            </div>
          </ActionForm>
        )}
      </GlassCard>

      <GlassCard eyebrow="Hapus">
        <form action={hapusKlien.bind(null, id)} className="stack">
          <p className="t-sub">Menghapus klien juga menghapus biodata, riwayat, foto, CV, versi, dan order-nya. Tidak bisa dibatalkan.</p>
          <div><ConfirmButton message={`Hapus ${c.nama} beserta semua datanya?`}>Hapus klien</ConfirmButton></div>
        </form>
      </GlassCard>
    </div>
  );
}
