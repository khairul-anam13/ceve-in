import Link from "next/link";
import { List, ListRow } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Klien" };

export default async function DaftarKlien({ searchParams }: { searchParams: Promise<{ q?: string; arsip?: string }> }) {
  await requireAdmin();
  const { q = "", arsip } = await searchParams;
  const cari = `%${q.trim()}%`;
  const rows = await sql`
    select c.id, c.nama, c.hp, c.status, c.user_id is not null as punya_akun,
      (select count(*)::int from cvs where client_id = c.id) as cv,
      (select count(*)::int from orders where client_id = c.id and status not in ('selesai','batal')) as order_aktif
    from clients c
    where c.status = ${arsip ? "arsip" : "aktif"} and (c.nama ilike ${cari} or c.hp ilike ${cari} or c.email ilike ${cari})
    order by c.nama`;

  return (
    <div className="stack-lg">
      <div className="hero spread wrap">
        <h1 className="t-large">Klien</h1>
        <Link href="/klien/baru" className={btnClass("filled", "medium")}>Klien baru</Link>
      </div>

      <form className="row" role="search">
        <label className="ios-search grow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" /><path d="M15.5 15.5 20.5 20.5" /></svg>
          <input type="search" name="q" defaultValue={q} placeholder="Cari nama, HP, atau email" />
        </label>
        {arsip && <input type="hidden" name="arsip" value="1" />}
      </form>

      <div className="row">
        <Link href="/klien" className={btnClass(arsip ? "gray" : "tinted", "small")}>Aktif</Link>
        <Link href="/klien?arsip=1" className={btnClass(arsip ? "tinted" : "gray", "small")}>Arsip</Link>
      </div>

      {rows.length === 0 ? (
        <p className="empty">{q ? "Tidak ada klien yang cocok." : arsip ? "Arsip kosong." : "Belum ada klien. Tambahkan klien pertama Anda."}</p>
      ) : (
        <List>
          {rows.map((c) => (
            <ListRow key={c.id} href={`/klien/${c.id}`} title={c.nama}
              subtitle={[c.hp, `${c.cv} CV`, c.order_aktif ? `${c.order_aktif} order berjalan` : ""].filter(Boolean).join(" · ")}
              detail={c.punya_akun ? <span className="badge badge--tint">Punya akun</span> : undefined} accessory="chevron" />
          ))}
        </List>
      )}
    </div>
  );
}
