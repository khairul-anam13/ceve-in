import { keluar } from "@/app/aksi/auth";
import type { Actor } from "@/lib/auth";
import { Button } from "./ios";
import { NavTabs } from "./nav-tabs";

const ADMIN_TABS = [
  { href: "/", label: "Dasbor" },
  { href: "/klien", label: "Klien" },
  { href: "/order", label: "Order" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export function Brand() {
  return (
    <span className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand__mark" src="/logo-koin.png" width={30} height={30} alt="" />
      CEVE-IN
    </span>
  );
}

/** Kerangka halaman: bilah kaca di atas, tab untuk admin, tombol keluar. */
export function Shell({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  return (
    <>
      <div className="topbar ios-nav">
        <div className="ios-nav__bar" style={{ paddingLeft: 16 }}>
          <div className="ios-nav__side"><Brand /></div>
          <div className="ios-nav__side ios-nav__side--trailing">
            {actor.kind === "tamu" ? (
              <span className="badge">Mengisi data</span>
            ) : (
              <>
                <span className="t-foot muted" style={{ color: "var(--label)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor.nama}</span>
                <form action={keluar}><Button size="small" variant="gray" type="submit">Keluar</Button></form>
              </>
            )}
          </div>
        </div>
        {actor.kind === "admin" && <NavTabs tabs={ADMIN_TABS} />}
      </div>
      <main className="wide pt-16">{children}</main>
    </>
  );
}
