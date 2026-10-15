import { notFound } from "next/navigation";
import { hapusFoto, simpanProfil } from "@/app/aksi/data";
import { ActionForm } from "@/components/action-form";
import { FotoUnggah } from "@/components/foto-unggah";
import { Icon, GlassCard, NavigationBar } from "@/components/ios";
import { requireAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Biodata" };

export default async function Profil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireAccess(id, "data");
  const [p] = await sql`select nama_lengkap, tempat_lahir, tgl_lahir::text as tgl_lahir, alamat, kota, hp, email, linkedin, (foto_data is not null) as foto, ringkasan, status_nikah, agama, tinggi, berat, updated_at from profiles where client_id = ${id}`;
  if (!p) notFound();

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title="Biodata" backLabel="Kembali" backHref={`/klien/${id}`} />

      <GlassCard>
        <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={`/api/foto/${id}?t=${+new Date(p.updated_at)}`} alt="Foto klien" />
          ) : (
            <span className="avatar"><Icon name="person" size={32} /></span>
          )}
          <div className="grow stack">
            <FotoUnggah clientId={id} />
            {p.foto && (
              <form action={hapusFoto.bind(null, id)}><button type="submit" className={btnClass("plain", "small", true)}>Hapus foto</button></form>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <ActionForm action={simpanProfil.bind(null, id)} submit="Simpan biodata">
          <label><span className="label">Nama lengkap</span><input className="field" name="nama_lengkap" defaultValue={p.nama_lengkap} required /></label>
          <div className="grid-2">
            <label><span className="label">Nomor HP / WhatsApp</span><input className="field" name="hp" inputMode="tel" defaultValue={p.hp} /></label>
            <label><span className="label">Email</span><input className="field" type="email" name="email" defaultValue={p.email} /></label>
          </div>
          <div className="grid-2">
            <label><span className="label">Kota</span><input className="field" name="kota" defaultValue={p.kota} /></label>
            <label><span className="label">LinkedIn / portofolio</span><input className="field" name="linkedin" defaultValue={p.linkedin} /></label>
          </div>
          <label><span className="label">Alamat</span><input className="field" name="alamat" defaultValue={p.alamat} /></label>
          <label><span className="label">Ringkasan profil</span>
            <textarea className="field" name="ringkasan" rows={4} defaultValue={p.ringkasan} placeholder="2–3 kalimat: siapa Anda, pengalaman utama, dan nilai yang Anda bawa." />
          </label>

          <p className="eyebrow" style={{ paddingLeft: 0 }}>Data pribadi — tampil di CV hanya bila diaktifkan</p>
          <div className="grid-2">
            <label><span className="label">Tempat lahir</span><input className="field" name="tempat_lahir" defaultValue={p.tempat_lahir} /></label>
            <label><span className="label">Tanggal lahir</span><input className="field" type="date" name="tgl_lahir" defaultValue={p.tgl_lahir ?? ""} /></label>
          </div>
          <div className="grid-2">
            <label><span className="label">Status pernikahan</span><input className="field" name="status_nikah" defaultValue={p.status_nikah} placeholder="Belum menikah" /></label>
            <label><span className="label">Agama</span><input className="field" name="agama" defaultValue={p.agama} /></label>
          </div>
          <div className="grid-2">
            <label><span className="label">Tinggi (cm)</span><input className="field" inputMode="numeric" name="tinggi" defaultValue={p.tinggi ?? ""} /></label>
            <label><span className="label">Berat (kg)</span><input className="field" inputMode="numeric" name="berat" defaultValue={p.berat ?? ""} /></label>
          </div>
        </ActionForm>
      </GlassCard>
    </div>
  );
}
