import Link from "next/link";
import { notFound } from "next/navigation";
import { duplikatCv, hapusCv, simpanCv, simpanVersi } from "@/app/aksi/cv";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { GlassCard, Icon, List } from "@/components/ios";
import { LowonganCek } from "@/components/lowongan-cek";
import { PaperPreview } from "@/components/paper-preview";
import { periksaCv } from "@/lib/ats";
import { clientOf, requireAccess } from "@/lib/auth";
import { buildCvData } from "@/lib/cv";
import { FIELD, TEMPLATES, TIPE, TIPE_LABEL, type Tipe } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { periode, waktu } from "@/lib/format";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Editor CV" };

export default async function EditorCv({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pulih?: string; kuota?: string }> }) {
  const { id } = await params;
  const { pulih, kuota } = await searchParams;
  const clientId = await clientOf("cvs", id);
  if (!clientId) notFound();
  await requireAccess(clientId, "cv");

  const [cv] = await sql`select id, label, target_posisi, template, pakai_foto, pakai_data_pribadi, ringkasan_override, urutan_bagian, updated_at from cvs where id = ${id}`;
  const [p] = await sql`select nama_lengkap, ringkasan, (foto_data is not null) as foto from profiles where client_id = ${clientId}`;
  const entries = await sql`
    select e.id, e.tipe, e.judul, e.instansi, e.mulai::text as mulai, e.selesai::text as selesai, e.berjalan, e.butir,
      (ce.cv_id is not null) as dipilih, ce.butir_override
    from entries e left join cv_entries ce on ce.entry_id = e.id and ce.cv_id = ${id}
    where e.client_id = ${clientId} order by e.tipe, e.urutan, e.id`;
  const [ver] = await sql`select max(nomor) as nomor, max(created_at) as at from versions where cv_id = ${id}`;
  const data = await buildCvData(id);
  const temuan = data ? periksaCv(data) : [];
  const dulu = ((cv.urutan_bagian as string[] | null) ?? [])[0] ?? "";

  const per = new Map<Tipe, (typeof entries)[number][]>();
  for (const e of entries) per.set(e.tipe, [...(per.get(e.tipe as Tipe) ?? []), e]);
  const cache = +new Date(cv.updated_at);

  return (
    <div className="stack-lg">
      <div className="hero stack">
        <Link href={`/klien/${clientId}`} className="t-sub">‹ {p?.nama_lengkap ?? "Klien"}</Link>
        <div className="spread wrap">
          <h1 className="t-large">{cv.label}</h1>
          <div className="row wrap">
            <a href={`/api/cv/${id}/pdf?unduh=1`} className={btnClass("filled", "medium")}><Icon name="download" size={16} /> PDF</a>
            <a href={`/api/cv/${id}/docx`} className={btnClass("tinted", "medium")}><Icon name="download" size={16} /> Word</a>
            <Link href={`/cv/${id}/versi`} className={btnClass("gray", "medium")}><Icon name="history" size={16} /> Riwayat</Link>
          </div>
        </div>
        {pulih && <p className="notice">Isi CV dikembalikan ke versi {pulih}. Simpan sebagai versi baru bila sudah sesuai.</p>}
        {kuota && <p className="notice notice--warn">Jumlah CV sudah mencapai batas akun ini.</p>}
      </div>

      <div className="editor">
        <div className="stack-lg">
          <GlassCard eyebrow="Pengaturan CV">
            <ActionForm action={simpanCv.bind(null, id)} submit="Simpan perubahan">
              <div className="grid-2">
                <label><span className="label">Nama CV</span><input className="field" name="label" defaultValue={cv.label} required /></label>
                <label><span className="label">Posisi yang dilamar</span><input className="field" name="target" defaultValue={cv.target_posisi} placeholder="Staf Administrasi" /></label>
              </div>
              <div className="grid-2">
                <label><span className="label">Template</span>
                  <select className="field" name="template" defaultValue={cv.template}>
                    {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.nama}</option>)}
                  </select>
                </label>
                <label><span className="label">Bagian paling atas</span>
                  <select className="field" name="dulu" defaultValue={dulu}>
                    <option value="">Ikuti template</option>
                    <option value="kerja">Pengalaman kerja</option>
                    <option value="pendidikan">Pendidikan</option>
                  </select>
                </label>
              </div>
              <p className="t-foot muted">{Object.values(TEMPLATES).map((t) => <span key={t.nama} style={{ display: "block" }}><b>{t.nama}</b> — {t.deskripsi}</span>)}</p>
              <label className="check"><input type="checkbox" name="pakai_foto" defaultChecked={cv.pakai_foto} disabled={!p?.foto} />
                <span className="t-sub">Tampilkan foto{!p?.foto ? " (belum ada foto di biodata)" : ""}</span></label>
              <label className="check"><input type="checkbox" name="pakai_data_pribadi" defaultChecked={cv.pakai_data_pribadi} />
                <span className="t-sub">Tampilkan data pribadi (tempat/tanggal lahir, status, agama, tinggi/berat)</span></label>
              <label><span className="label">Ringkasan profil untuk CV ini (kosong = pakai ringkasan dari biodata)</span>
                <textarea className="field" name="ringkasan" rows={3} defaultValue={cv.ringkasan_override ?? ""} placeholder={p?.ringkasan || "Belum ada ringkasan di biodata"} />
              </label>

              <div className="stack">
                <p className="eyebrow" style={{ paddingLeft: 0, paddingBottom: 0 }}>Isi CV</p>
                {entries.length === 0 && <p className="notice notice--warn">Belum ada riwayat. <Link href={`/klien/${clientId}`}>Tambahkan pengalaman atau pendidikan</Link> dulu.</p>}
                {TIPE.filter((t) => per.has(t)).map((t) => (
                  <section key={t}>
                    <p className="label">{TIPE_LABEL[t]}</p>
                    <div className="ios-list__body">
                      {per.get(t)!.map((e) => {
                        const butir = ((e.butir_override ?? e.butir) as string[]).join("\n");
                        const sub = [e.instansi, FIELD[t].tanggal === "rentang" ? periode(e.mulai, e.selesai, e.berjalan) : ""].filter(Boolean).join(" · ");
                        return (
                          <details key={e.id} className="entry-pick">
                            <summary>
                              <label className="check">
                                <input type="checkbox" name="pilih" value={e.id} defaultChecked={e.dipilih} />
                                <span><b>{e.judul}</b>{sub && <><br /><span className="t-foot muted">{sub}</span></>}</span>
                              </label>
                              {FIELD[t].butir && <span className="t-foot tint">Poin</span>}
                            </summary>
                            {FIELD[t].butir && (
                              <div className="entry-pick__body">
                                <label><span className="label">Poin untuk CV ini — ubah di sini tidak mengubah riwayat klien</span>
                                  <textarea className="field" name={`butir_${e.id}`} rows={5} defaultValue={butir} />
                                </label>
                              </div>
                            )}
                          </details>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </ActionForm>
          </GlassCard>

          <GlassCard eyebrow={ver?.nomor ? `Versi terakhir: v${ver.nomor} · ${waktu(ver.at)}` : "Belum ada versi tersimpan"}>
            <ActionForm action={simpanVersi.bind(null, id)} submit="Simpan sebagai versi baru" variant="tinted">
              <label><span className="label">Catatan versi</span><input className="field" name="catatan" placeholder="Tambah pengalaman Mei 2026" /></label>
              <p className="t-foot muted">Menyimpan salinan CV seperti keadaannya sekarang. Simpan perubahan di atas dulu.</p>
            </ActionForm>
          </GlassCard>

          <section className="stack">
            <List header="Pemeriksaan sistem rekrutmen" footer={temuan.length ? undefined : "Tidak ada masalah yang terdeteksi."}>
              {temuan.map((t, i) => (
                <div key={i} className="temuan" role="listitem">
                  <span className={`badge ${t.tingkat === "peringatan" ? "badge--red" : "badge--orange"}`}>{t.tingkat === "peringatan" ? "Perbaiki" : "Saran"}</span>
                  <span>{t.teks}</span>
                </div>
              ))}
            </List>
          </section>

          <GlassCard eyebrow="Cocokkan dengan lowongan">
            <LowonganCek cvId={id} />
          </GlassCard>

          <div className="row wrap">
            <form action={duplikatCv.bind(null, id)}><button type="submit" className={btnClass("gray", "medium")}><Icon name="copy" size={16} /> Duplikat CV</button></form>
            <form action={hapusCv.bind(null, id)}><ConfirmButton message="Hapus CV ini beserta semua versinya?">Hapus CV</ConfirmButton></form>
          </div>
        </div>

        <aside className="editor__preview" aria-label="Pratinjau CV">
          <PaperPreview src={`/api/cv/${id}/html?kertas=1&t=${cache}`} />
          <p className="t-foot muted center mt-8">Pratinjau diperbarui setiap kali Anda menyimpan perubahan.</p>
        </aside>
      </div>
    </div>
  );
}
