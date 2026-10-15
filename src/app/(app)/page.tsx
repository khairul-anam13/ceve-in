import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/badge";
import { GlassCard, List, ListRow } from "@/components/ios";
import { getActor } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hariIni, rupiah } from "@/lib/format";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Dasbor" };

export default async function Dasbor() {
  const a = await getActor();
  if (!a) redirect("/masuk");
  if (a.kind !== "admin") redirect(`/klien/${a.clientId}`);

  const hari = hariIni();
  const [s] = await sql`
    select
      count(*) filter (where status not in ('selesai','batal'))::int as aktif,
      count(*) filter (where status not in ('selesai','batal') and deadline <= (${hari}::date + 7))::int as dekat,
      coalesce(sum(harga - dibayar) filter (where status <> 'batal' and harga > dibayar), 0)::bigint as piutang,
      (select count(*)::int from clients where status = 'aktif') as klien
    from orders`;
  const order = await sql`
    select o.id, o.judul, o.jenis, o.status, o.deadline::text as deadline, c.nama
    from orders o join clients c on c.id = o.client_id
    where o.status not in ('selesai','batal')
    order by o.deadline nulls last, o.created_at limit 12`;
  const tindak = await sql`
    select id, nama, ingatkan_at::text as ingatkan_at from clients
    where status = 'aktif' and ingatkan_at is not null and ingatkan_at <= (${hari}::date + 7)
    order by ingatkan_at limit 8`;
  const belumLunas = await sql`
    select o.id, o.judul, o.harga, o.dibayar, c.nama from orders o join clients c on c.id = o.client_id
    where o.status <> 'batal' and o.harga > o.dibayar order by o.created_at desc limit 6`;

  return (
    <div className="stack-lg">
      <div className="hero spread wrap">
        <h1 className="t-large">Dasbor</h1>
        <div className="row">
          <Link href="/klien/baru" className={btnClass("filled", "medium")}>Klien baru</Link>
        </div>
      </div>

      <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
        <GlassCard className="stat"><p className="t-foot muted">Order berjalan</p><p className="stat__n">{s.aktif}</p></GlassCard>
        <GlassCard className="stat"><p className="t-foot muted">Deadline 7 hari</p><p className="stat__n">{s.dekat}</p></GlassCard>
        <GlassCard className="stat"><p className="t-foot muted">Belum dibayar</p><p className="stat__n">{rupiah(s.piutang)}</p></GlassCard>
        <GlassCard className="stat"><p className="t-foot muted">Klien aktif</p><p className="stat__n">{s.klien}</p></GlassCard>
      </div>

      <div className="board">
        <List header="Order berjalan" footer={order.length ? undefined : "Belum ada order berjalan."}>
          {order.map((o) => (
            <ListRow key={o.id} href={`/order/${o.id}`} title={o.nama} subtitle={`${o.judul || "Tanpa judul"}${o.deadline ? ` · batas ${o.deadline}` : ""}`} detail={<StatusBadge status={o.status} />} accessory="chevron" />
          ))}
        </List>

        <div className="stack-lg">
          <List header="Perlu ditanyai kabar" footer={tindak.length ? "Tanyakan apakah ada pengalaman atau pendidikan baru untuk CV mereka." : "Tidak ada yang perlu ditanyai minggu ini."}>
            {tindak.map((c) => (
              <ListRow key={c.id} href={`/klien/${c.id}`} title={c.nama} detail={c.ingatkan_at} accessory="chevron" />
            ))}
          </List>
          {belumLunas.length > 0 && (
            <List header="Belum lunas">
              {belumLunas.map((o) => (
                <ListRow key={o.id} href={`/order/${o.id}`} title={o.nama} subtitle={o.judul || undefined} detail={rupiah(o.harga - o.dibayar)} accessory="chevron" />
              ))}
            </List>
          )}
        </div>
      </div>
    </div>
  );
}
