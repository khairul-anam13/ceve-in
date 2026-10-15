import Link from "next/link";
import { StatusBadge } from "@/components/badge";
import { List, ListRow } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { JENIS_ORDER, rupiah, STATUS_ORDER } from "@/lib/format";
import { btnClass } from "@/lib/ui";

export const metadata = { title: "Order" };

export default async function DaftarOrder({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = "berjalan" } = await searchParams;
  const rows = await sql`
    select o.id, o.judul, o.jenis, o.status, o.deadline::text as deadline, o.harga, o.dibayar, c.nama
    from orders o join clients c on c.id = o.client_id
    where ${status === "berjalan" ? sql`o.status not in ('selesai','batal')` : status === "semua" ? sql`true` : sql`o.status = ${status}`}
    order by o.deadline nulls last, o.created_at desc limit 200`;
  const filter = [["berjalan", "Berjalan"], ["selesai", "Selesai"], ["semua", "Semua"]];

  return (
    <div className="stack-lg">
      <div className="hero"><h1 className="t-large">Order</h1></div>
      <div className="row wrap">
        {filter.map(([k, l]) => <Link key={k} href={`/order?status=${k}`} className={btnClass(status === k ? "tinted" : "gray", "small")}>{l}</Link>)}
        {Object.keys(STATUS_ORDER).filter((s) => !["selesai"].includes(s)).map((s) => (
          <Link key={s} href={`/order?status=${s}`} className={btnClass(status === s ? "tinted" : "gray", "small")}>{STATUS_ORDER[s]}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="empty">Tidak ada order di filter ini. Buat order dari halaman klien.</p>
      ) : (
        <List>
          {rows.map((o) => (
            <ListRow key={o.id} href={`/order/${o.id}`} title={`${o.nama} — ${o.judul || JENIS_ORDER[o.jenis]}`}
              subtitle={[o.deadline ? `batas ${o.deadline}` : "", o.harga > 0 ? `${rupiah(o.dibayar)} / ${rupiah(o.harga)}` : ""].filter(Boolean).join(" · ") || undefined}
              detail={<StatusBadge status={o.status} />} accessory="chevron" />
          ))}
        </List>
      )}
    </div>
  );
}
