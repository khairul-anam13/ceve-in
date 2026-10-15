import { gantiPassword, simpanPengaturan } from "@/app/aksi/order";
import { ActionForm } from "@/components/action-form";
import { GlassCard } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { TEMPLATES } from "@/lib/cv-types";
import { sql } from "@/lib/db";

export const metadata = { title: "Pengaturan" };

export default async function Pengaturan() {
  await requireAdmin();
  const [s] = await sql`select nama_jasa, kontak, daftar_terbuka, kuota_mandiri, template_default from settings where id = 1`;
  return (
    <div className="narrow stack-lg">
      <div className="hero"><h1 className="t-large">Pengaturan</h1></div>

      <GlassCard eyebrow="Jasa dan pendaftaran klien">
        <ActionForm action={simpanPengaturan} submit="Simpan">
          <div className="grid-2">
            <label><span className="label">Nama jasa</span><input className="field" name="nama_jasa" defaultValue={s.nama_jasa} /></label>
            <label><span className="label">Kontak untuk klien (WhatsApp/email)</span><input className="field" name="kontak" defaultValue={s.kontak} /></label>
          </div>
          <label><span className="label">Template bawaan CV baru</span>
            <select className="field" name="template_default" defaultValue={s.template_default}>
              {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nama}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" name="daftar_terbuka" defaultChecked={s.daftar_terbuka} />
            <span className="t-sub">Izinkan klien mendaftar sendiri lewat halaman Daftar</span></label>
          <label><span className="label">Jumlah CV untuk klien yang mendaftar sendiri</span>
            <input className="field" name="kuota_mandiri" inputMode="numeric" defaultValue={s.kuota_mandiri} />
          </label>
        </ActionForm>
      </GlassCard>

      <GlassCard eyebrow="Ganti password admin">
        <ActionForm action={gantiPassword} submit="Ganti password" variant="tinted">
          <div className="grid-2">
            <label><span className="label">Password baru</span><input className="field" type="password" name="baru" minLength={8} autoComplete="new-password" required /></label>
            <label><span className="label">Ulangi password</span><input className="field" type="password" name="ulang" minLength={8} autoComplete="new-password" required /></label>
          </div>
        </ActionForm>
      </GlassCard>
    </div>
  );
}
