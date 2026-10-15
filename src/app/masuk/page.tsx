import Link from "next/link";
import { redirect } from "next/navigation";
import { masuk } from "@/app/aksi/auth";
import { ActionForm } from "@/components/action-form";
import { GlassCard } from "@/components/ios";
import { getActor } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Masuk" };

export default async function Masuk({ searchParams }: { searchParams: Promise<{ isi?: string }> }) {
  if (await getActor()) redirect("/");
  const { isi } = await searchParams;
  const [cfg] = await sql`select daftar_terbuka from settings where id = 1`;
  return (
    <main className="auth">
      <div className="auth__sheets" aria-hidden><i /><i /></div>
      <GlassCard variant="strong" className="auth__card">
        <div className="stack-lg">
          <div className="stack">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="auth__logo" src="/logo.png" width={132} height={132} alt="CEVE-IN" />
            <h1 className="t-title2">Masuk</h1>
            <p className="t-sub muted">Kelola dan perbarui CV Anda di satu tempat.</p>
          </div>
          {isi === "gagal" && <p className="notice notice--warn" role="alert">Tautan pengisian data sudah tidak berlaku. Minta tautan baru dari penyedia jasa.</p>}
          <ActionForm action={masuk} submit="Masuk">
            <label><span className="label">Email</span><input className="field" type="email" name="email" autoComplete="username" required /></label>
            <label><span className="label">Password</span><input className="field" type="password" name="password" autoComplete="current-password" required /></label>
          </ActionForm>
          {cfg?.daftar_terbuka && <p className="t-sub center">Belum punya akun? <Link href="/daftar">Daftar</Link></p>}
        </div>
      </GlassCard>
    </main>
  );
}
