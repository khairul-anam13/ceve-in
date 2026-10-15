import Link from "next/link";
import { notFound } from "next/navigation";
import { pulihkanVersi } from "@/app/aksi/cv";
import { ConfirmButton } from "@/components/confirm-button";
import { GlassCard, NavigationBar } from "@/components/ios";
import { clientOf, requireAccess } from "@/lib/auth";
import { barisTeks, type CvData } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { waktu } from "@/lib/format";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Riwayat versi" };

export default async function Versi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await clientOf("cvs", id);
  if (!clientId) notFound();
  await requireAccess(clientId, "cv");
  const [cv] = await sql`select label from cvs where id = ${id}`;
  const rows = await sql`select nomor, catatan, created_at, snapshot from versions where cv_id = ${id} order by nomor desc`;

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title="Riwayat versi" backLabel={cv.label} backHref={`/cv/${id}`} />
      {rows.length === 0 && <p className="empty">Belum ada versi. Simpan versi pertama dari halaman editor.</p>}
      {rows.map((v, i) => {
        const sebelumnya = rows[i + 1];
        const now = new Set(barisTeks(v.snapshot as CvData));
        const prev = sebelumnya ? new Set(barisTeks(sebelumnya.snapshot as CvData)) : null;
        const tambah = prev ? [...now].filter((x) => !prev.has(x)) : [];
        const hapus = prev ? [...prev].filter((x) => !now.has(x)) : [];
        return (
          <GlassCard key={v.nomor} eyebrow={waktu(v.created_at)} title={`Versi ${v.nomor}`}>
            <div className="stack">
              {v.catatan && <p className="t-sub">{v.catatan}</p>}
              <div className="row wrap">
                <a className={btnClass("tinted", "small")} href={`/api/cv/${id}/html?versi=${v.nomor}`} target="_blank" rel="noreferrer">Lihat</a>
                <a className={btnClass("gray", "small")} href={`/api/cv/${id}/pdf?versi=${v.nomor}&unduh=1`}>PDF</a>
                <a className={btnClass("gray", "small")} href={`/api/cv/${id}/docx?versi=${v.nomor}`}>Word</a>
                <form action={pulihkanVersi.bind(null, id, v.nomor)}>
                  <ConfirmButton message={`Kembalikan isi CV ke versi ${v.nomor}? Isi CV sekarang akan ditimpa (versi yang sudah tersimpan tetap aman).`} destructive={false} size="small">Pulihkan</ConfirmButton>
                </form>
              </div>
              {prev && (tambah.length > 0 || hapus.length > 0) && (
                <details>
                  <summary className="t-sub tint" style={{ cursor: "pointer" }}>{tambah.length} baris ditambah, {hapus.length} dihapus dari versi {sebelumnya.nomor}</summary>
                  <ul className="t-sub" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {tambah.slice(0, 20).map((t, k) => <li key={`t${k}`}><span className="badge badge--green">Baru</span> {t}</li>)}
                    {hapus.slice(0, 20).map((t, k) => <li key={`h${k}`}><span className="badge badge--red">Dihapus</span> {t}</li>)}
                  </ul>
                </details>
              )}
              {prev && tambah.length === 0 && hapus.length === 0 && <p className="t-foot muted">Isi teks sama dengan versi sebelumnya.</p>}
            </div>
          </GlassCard>
        );
      })}
      <p className="t-foot muted"><Link href={`/cv/${id}`}>Kembali ke editor</Link></p>
    </div>
  );
}
