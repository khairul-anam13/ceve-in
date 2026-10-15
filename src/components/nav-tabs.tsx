"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { btnClass } from "@/lib/ui";

export function NavTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(h + "/"));
  return (
    <nav className="tabs" aria-label="Menu">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={btnClass(active(t.href) ? "filled" : "gray", "medium")} aria-current={active(t.href) ? "page" : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
