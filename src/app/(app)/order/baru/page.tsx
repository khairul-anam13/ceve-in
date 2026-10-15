import { notFound } from "next/navigation";
import { buatOrder } from "@/app/aksi/order";
import { ActionForm } from "@/components/action-form";
import { GlassCard, NavigationBar } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { JENIS_ORDER } from "@/lib/format";

export const metadata = { title: "Order baru" };

export default async function OrderBaru({ searchParams }: { searchParams: Promise<{ klien?: string }> }) {
  await requireAdmin();
  const { klien } = await searchParams;
  if (!klien || !/^[0-9a-f-]{36}$/i.test(klien)) notFound();
  const [c] = await sql`select nama from clients where id = ${klien}`;
  if (!c) notFound();
  const cvs = await sql`select id, label from cvs where client_id = ${klien} order by created_at`;

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title="Order baru" backLabel={c.nama} backHref={`/klien/${klien}`} />
      <GlassCard>
        <ActionForm action={buatOrder.bind(null, klien)} submit="Buat order">
          <div className="grid-2">
            <label><span className="label">Jenis</span>
              <select className="field" name="jenis">{Object.entries(JENIS_ORDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label><span className="label">CV terkait (opsional)</span>
              <select className="field" name="cv_id"><option value="">—</option>{cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.label}</option>)}</select>
            </label>
          </div>
          <label><span className="label">Judul</span><input className="field" name="judul" placeholder="CV baru untuk melamar ke bank" /></label>
          <div className="grid-2">
            <label><span className="label">Harga (Rp)</span><input className="field" name="harga" inputMode="numeric" placeholder="0" /></label>
            <label><span className="label">Batas revisi</span><input className="field" name="batas_revisi" inputMode="numeric" defaultValue={2} /></label>
          </div>
          <label><span className="label">Batas waktu</span><input className="field" type="date" name="deadline" /></label>
          <label><span className="label">Catatan</span><textarea className="field" name="catatan" rows={3} /></label>
        </ActionForm>
      </GlassCard>
    </div>
  );
}
