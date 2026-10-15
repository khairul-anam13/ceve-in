import Link from "next/link";
import { notFound } from "next/navigation";
import { hapusOrder, simpanOrder } from "@/app/aksi/order";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { GlassCard, NavigationBar } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { JENIS_ORDER, STATUS_ORDER, waktu } from "@/lib/format";

export const metadata = { title: "Order" };

export default async function DetailOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireAdmin();
  const [o] = await sql`
    select o.id, o.client_id, o.cv_id, o.jenis, o.status, o.judul, o.deadline::text as deadline, o.revisi_ke, o.batas_revisi, o.harga, o.dibayar, o.catatan, o.created_at, c.nama
    from orders o join clients c on c.id = o.client_id where o.id = ${id}`;
  if (!o) notFound();
  const cvs = await sql`select id, label from cvs where client_id = ${o.client_id} order by created_at`;
  const lewatBatas = o.revisi_ke > o.batas_revisi;

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title={o.nama} backLabel="Order" backHref="/order" />
      <p className="t-sub muted">Dibuat {waktu(o.created_at)} · <Link href={`/klien/${o.client_id}`}>Buka klien</Link>{o.cv_id && <> · <Link href={`/cv/${o.cv_id}`}>Buka CV</Link></>}</p>
      {lewatBatas && <p className="notice notice--warn">Revisi sudah melewati batas ({o.revisi_ke} dari {o.batas_revisi}). Pertimbangkan biaya tambahan.</p>}
      <GlassCard>
        <ActionForm action={simpanOrder.bind(null, id)} submit="Simpan order">
          <label><span className="label">Judul</span><input className="field" name="judul" defaultValue={o.judul} /></label>
          <div className="grid-2">
            <label><span className="label">Status</span>
              <select className="field" name="status" defaultValue={o.status}>{Object.entries(STATUS_ORDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label><span className="label">Jenis</span>
              <select className="field" name="jenis" defaultValue={o.jenis}>{Object.entries(JENIS_ORDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
          </div>
          <div className="grid-2">
            <label><span className="label">Harga (Rp)</span><input className="field" name="harga" inputMode="numeric" defaultValue={String(o.harga)} /></label>
            <label><span className="label">Sudah dibayar (Rp)</span><input className="field" name="dibayar" inputMode="numeric" defaultValue={String(o.dibayar)} /></label>
          </div>
          <div className="grid-2">
            <label><span className="label">Revisi berjalan</span><input className="field" name="revisi_ke" inputMode="numeric" defaultValue={o.revisi_ke} /></label>
            <label><span className="label">Batas revisi</span><input className="field" name="batas_revisi" inputMode="numeric" defaultValue={o.batas_revisi} /></label>
          </div>
          <div className="grid-2">
            <label><span className="label">Batas waktu</span><input className="field" type="date" name="deadline" defaultValue={o.deadline ?? ""} /></label>
            <label><span className="label">CV terkait</span>
              <select className="field" name="cv_id" defaultValue={o.cv_id ?? ""}><option value="">—</option>{cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.label}</option>)}</select>
            </label>
          </div>
          <label><span className="label">Catatan</span><textarea className="field" name="catatan" rows={4} defaultValue={o.catatan} /></label>
        </ActionForm>
      </GlassCard>
      <form action={hapusOrder.bind(null, id)}><ConfirmButton message="Hapus order ini?">Hapus order</ConfirmButton></form>
    </div>
  );
}
