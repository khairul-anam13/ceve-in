import Link from "next/link";
import { notFound } from "next/navigation";
import { mintaPerubahan } from "@/app/aksi/order";
import { buatCv } from "@/app/aksi/cv";
import { ActionForm } from "@/components/action-form";
import { StatusBadge } from "@/components/badge";
import { GlassCard, Icon, List, ListRow, type IconName } from "@/components/ios";
import { requireAccess } from "@/lib/auth";
import { FIELD, TEMPLATES, TIPE, TIPE_LABEL, type Tipe } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { JENIS_ORDER, periode, rupiah } from "@/lib/format";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Klien" };

const IKON: Record<Tipe, { icon: IconName; warna: string }> = {
  kerja: { icon: "briefcase", warna: "system-indigo" },
  magang: { icon: "briefcase", warna: "system-cyan" },
  pendidikan: { icon: "school", warna: "system-blue" },
  skill: { icon: "chart", warna: "system-teal" },
  sertifikat: { icon: "shield", warna: "system-green" },
  organisasi: { icon: "users", warna: "system-orange" },
  proyek: { icon: "doc", warna: "system-purple" },
  bahasa: { icon: "list", warna: "system-pink" },
  penghargaan: { icon: "check", warna: "system-brown" },
};

export default async function HubKlien({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const actor = await requireAccess(id, "data");
  const admin = actor.kind === "admin";
  const tamu = actor.kind === "tamu";

  const [c] = await sql`select id, nama, status, user_id, kuota_cv from clients where id = ${id}`;
  if (!c) notFound();
  const [p] = await sql`select nama_lengkap, hp, email, kota, (foto_data is not null) as foto, updated_at from profiles where client_id = ${id}`;
  const entries = await sql`
    select id, tipe, judul, instansi, mulai::text as mulai, selesai::text as selesai, berjalan, updated_at
    from entries where client_id = ${id} order by tipe, urutan, id`;
  const cvs = tamu ? [] : await sql`
    select cv.id, cv.label, cv.target_posisi, cv.template, cv.updated_at,
      (select max(nomor) from versions v where v.cv_id = cv.id) as versi,
      (select max(created_at) from versions v where v.cv_id = cv.id) as versi_at,
      (select count(*)::int from entries e where e.client_id = cv.client_id
         and not exists (select 1 from cv_entries ce where ce.cv_id = cv.id and ce.entry_id = e.id)) as belum_masuk
    from cvs cv where cv.client_id = ${id} order by cv.created_at`;
  const orders = tamu ? [] : await sql`
    select id, judul, jenis, status, deadline::text as deadline, harga, dibayar from orders where client_id = ${id} order by created_at desc`;
  const [cfg] = await sql`select nama_jasa, kontak from settings where id = 1`;

  const terakhirUbah = Math.max(+new Date(p?.updated_at ?? 0), ...entries.map((e) => +new Date(e.updated_at)));
  const per = new Map<Tipe, (typeof entries)[number][]>();
  for (const e of entries) per.set(e.tipe, [...(per.get(e.tipe as Tipe) ?? []), e]);
  const penuh = c.kuota_cv != null && cvs.length >= c.kuota_cv && !admin;

  return (
    <div className="stack-lg">
      <div className="hero stack">
        {admin && <Link href="/klien" className="t-sub">‹ Klien</Link>}
        <div className="spread wrap">
          <h1 className="t-large">{p?.nama_lengkap || c.nama}</h1>
          {admin && (
            <div className="row">
              <Link href={`/order/baru?klien=${id}`} className={btnClass("tinted", "medium")}>Order baru</Link>
              <Link href={`/klien/${id}/kelola`} className={btnClass("gray", "medium")}>Kelola</Link>
            </div>
          )}
        </div>
        {c.status === "arsip" && <span className="badge">Diarsipkan</span>}
        {tamu && <p className="notice">Anda mengisi data lewat tautan khusus. Lengkapi biodata dan riwayat di bawah, penyedia jasa akan menyusunnya menjadi CV.</p>}
      </div>

      <List header="Biodata">
        <ListRow href={`/klien/${id}/profil`} title={p?.nama_lengkap ? "Biodata dan kontak" : "Lengkapi biodata"}
          subtitle={[p?.hp, p?.email, p?.kota].filter(Boolean).join(" · ") || "Nama, kontak, ringkasan, foto"}
          icon={<Icon name="person" />} iconColor="system-indigo" detail={p?.foto ? "Ada foto" : undefined} accessory="chevron" />
      </List>

      {TIPE.filter((t) => per.has(t)).map((t) => (
        <List key={t} header={TIPE_LABEL[t]}>
          {per.get(t)!.map((e) => (
            <ListRow key={e.id} href={`/klien/${id}/entry/${e.id}`} title={e.judul}
              subtitle={[e.instansi, FIELD[t].tanggal !== "tidak" ? periode(e.mulai, FIELD[t].tanggal === "rentang" ? e.selesai : null, e.berjalan) : ""].filter(Boolean).join(" · ") || undefined}
              icon={<Icon name={IKON[t].icon} />} iconColor={IKON[t].warna} accessory="chevron" />
          ))}
        </List>
      ))}

      <List header="Tambah data" footer={entries.length === 0 ? "Mulai dari pengalaman kerja dan pendidikan." : undefined}>
        {TIPE.map((t) => (
          <ListRow key={t} href={`/klien/${id}/entry/baru?tipe=${t}`} title={TIPE_LABEL[t]} icon={<Icon name="plus" />} iconColor={IKON[t].warna} action />
        ))}
      </List>

      {!tamu && (
        <>
          <section className="stack">
            <List header="CV" footer={cvs.length ? undefined : "Belum ada CV. Buat satu dari data di atas."}>
              {cvs.map((cv) => {
                const berubah = cv.versi_at && terakhirUbah > +new Date(cv.versi_at);
                const sub = [cv.target_posisi, TEMPLATES[cv.template as keyof typeof TEMPLATES]?.nama].filter(Boolean).join(" · ");
                return (
                  <ListRow key={cv.id} href={`/cv/${cv.id}`} title={cv.label} icon={<Icon name="doc" />} iconColor="system-indigo" accessory="chevron"
                    subtitle={
                      <>
                        {sub}
                        {(cv.belum_masuk > 0 || berubah) && (
                          <span className="row wrap" style={{ marginTop: 4 }}>
                            {cv.belum_masuk > 0 && <span className="badge badge--orange">{cv.belum_masuk} data belum masuk CV</span>}
                            {berubah && <span className="badge badge--orange">Data berubah sejak v{cv.versi}</span>}
                          </span>
                        )}
                      </>
                    }
                    detail={cv.versi ? `v${cv.versi}` : "Belum disimpan"} />
                );
              })}
            </List>
            <GlassCard variant="subtle">
              {penuh ? (
                <p className="t-sub">Jumlah CV sudah mencapai batas akun ini{cfg.kontak ? `. Hubungi ${cfg.nama_jasa}: ${cfg.kontak}` : "."}</p>
              ) : (
                <ActionForm action={buatCv.bind(null, id)} submit="Buat CV" variant="tinted">
                  <div className="grid-2">
                    <label><span className="label">Nama CV</span><input className="field" name="label" placeholder="CV Marketing" /></label>
                    <label><span className="label">Template</span>
                      <select className="field" name="template" defaultValue="klasik">
                        {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nama}</option>)}
                      </select>
                    </label>
                  </div>
                  <label><span className="label">Posisi yang dilamar (opsional)</span><input className="field" name="target" placeholder="Staf Administrasi" /></label>
                </ActionForm>
              )}
            </GlassCard>
          </section>

          <section className="stack">
            <List header="Order" footer={orders.length ? undefined : "Belum ada order."}>
              {orders.map((o) => (
                <ListRow key={o.id} href={admin ? `/order/${o.id}` : undefined} title={o.judul || JENIS_ORDER[o.jenis]}
                  subtitle={[JENIS_ORDER[o.jenis], o.deadline ? `batas ${o.deadline}` : "", o.harga > 0 ? `${rupiah(o.dibayar)} / ${rupiah(o.harga)}` : ""].filter(Boolean).join(" · ")}
                  detail={<StatusBadge status={o.status} />} accessory={admin ? "chevron" : "none"} />
              ))}
            </List>
            {!admin && (
              <GlassCard variant="subtle">
                <ActionForm action={mintaPerubahan.bind(null, id)} submit="Kirim permintaan" variant="tinted">
                  <label><span className="label">Butuh perubahan atau CV baru?</span>
                    <textarea className="field" name="catatan" rows={3} placeholder="Contoh: tambahkan pengalaman kerja terbaru di PT Maju sejak Mei." />
                  </label>
                </ActionForm>
              </GlassCard>
            )}
          </section>
        </>
      )}

      {!admin && cfg.kontak && <p className="t-foot muted center">Dikelola oleh {cfg.nama_jasa} · {cfg.kontak}</p>}
    </div>
  );
}
