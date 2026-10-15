import { notFound } from "next/navigation";
import { geserEntry, hapusEntry, simpanEntry } from "@/app/aksi/data";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { GlassCard, NavigationBar } from "@/components/ios";
import { requireAccess } from "@/lib/auth";
import { FIELD, TIPE, TIPE_LABEL, type Tipe } from "@/lib/cv-types";
import { sql } from "@/lib/db";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Data riwayat" };

export default async function EntryForm({ params, searchParams }: { params: Promise<{ id: string; eid: string }>; searchParams: Promise<{ tipe?: string }> }) {
  const { id, eid } = await params;
  const { tipe: tipeQ } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireAccess(id, "data");

  const baru = eid === "baru";
  let e: { tipe: Tipe; judul: string; instansi: string; lokasi: string; mulai: string | null; selesai: string | null; berjalan: boolean; butir: string[]; deskripsi: string } | undefined;
  if (!baru) {
    if (!/^[0-9a-f-]{36}$/i.test(eid)) notFound();
    const [r] = await sql`select tipe, judul, instansi, lokasi, mulai::text as mulai, selesai::text as selesai, berjalan, butir, deskripsi from entries where id = ${eid} and client_id = ${id}`;
    if (!r) notFound();
    e = r as typeof e;
  }
  const tipe = (e?.tipe ?? tipeQ) as Tipe;
  if (!TIPE.includes(tipe)) notFound();
  const f = FIELD[tipe];
  const bln = (d: string | null | undefined) => (d ? d.slice(0, 7) : "");

  return (
    <div className="narrow stack-lg">
      <NavigationBar large title={baru ? `Tambah ${TIPE_LABEL[tipe].toLowerCase()}` : TIPE_LABEL[tipe]} backLabel="Kembali" backHref={`/klien/${id}`} />
      <GlassCard>
        <ActionForm action={simpanEntry.bind(null, id, eid)} submit={baru ? "Tambahkan" : "Simpan"}>
          <input type="hidden" name="tipe" value={tipe} />
          <label><span className="label">{f.judul}</span><input className="field" name="judul" defaultValue={e?.judul} required autoFocus={baru} /></label>
          {f.instansi && (
            <div className="grid-2">
              <label><span className="label">{f.instansi}</span><input className="field" name="instansi" defaultValue={e?.instansi} /></label>
              <label><span className="label">Lokasi</span><input className="field" name="lokasi" defaultValue={e?.lokasi} placeholder="Kota" /></label>
            </div>
          )}
          {f.tanggal === "rentang" && (
            <>
              <div className="grid-2">
                <label><span className="label">Mulai</span><input className="field" type="month" name="mulai" defaultValue={bln(e?.mulai)} /></label>
                <label><span className="label">Selesai</span><input className="field" type="month" name="selesai" defaultValue={bln(e?.selesai)} /></label>
              </div>
              <label className="check"><input type="checkbox" name="berjalan" defaultChecked={e?.berjalan} /><span className="t-sub">Masih berjalan sampai sekarang</span></label>
            </>
          )}
          {f.tanggal === "satu" && (
            <label><span className="label">Tanggal</span><input className="field" type="month" name="mulai" defaultValue={bln(e?.mulai)} /></label>
          )}
          <label><span className="label">{f.deskripsi}</span><input className="field" name="deskripsi" defaultValue={e?.deskripsi} /></label>
          {f.butir && (
            <label><span className="label">Pencapaian dan tugas utama — satu poin per baris</span>
              <textarea className="field" name="butir" rows={6} defaultValue={(e?.butir ?? []).join("\n")}
                placeholder={"Mengelola arsip 1.200 dokumen per bulan\nMenurunkan waktu pencarian dokumen dari 15 menit menjadi 3 menit"} />
              <span className="t-foot muted">Mulai dengan kata kerja dan sertakan angka bila ada.</span>
            </label>
          )}
        </ActionForm>
      </GlassCard>

      {!baru && (
        <div className="row wrap">
          <form action={geserEntry.bind(null, id, eid, "naik")}><button className={btnClass("gray", "medium")} type="submit">Naikkan</button></form>
          <form action={geserEntry.bind(null, id, eid, "turun")}><button className={btnClass("gray", "medium")} type="submit">Turunkan</button></form>
          <form action={hapusEntry.bind(null, id, eid)}><ConfirmButton message="Hapus data ini? CV yang memakainya akan kehilangan bagian ini.">Hapus</ConfirmButton></form>
        </div>
      )}
    </div>
  );
}
