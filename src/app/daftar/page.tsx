import Link from "next/link";
import { redirect } from "next/navigation";
import { daftar } from "@/app/aksi/auth";
import { ActionForm } from "@/components/action-form";
import { GlassCard } from "@/components/ios";
import { getActor } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata = { title: "Daftar" };

export default async function Daftar() {
  if (await getActor()) redirect("/");
  const [cfg] = await sql`select daftar_terbuka, kuota_mandiri from settings where id = 1`;
  return (
    <main className="auth">
      <div className="auth__sheets" aria-hidden><i /><i /></div>
      <GlassCard variant="strong" className="auth__card">
        <div className="stack-lg">
          <div className="stack">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="auth__logo" src="/logo.png" width={132} height={132} alt="CEVE-IN" />
            <h1 className="t-title2">Buat akun</h1>
            <p className="t-sub muted">Isi data sekali, buat CV sendiri kapan saja.</p>
          </div>
          {!cfg?.daftar_terbuka ? (
            <p className="notice">Pendaftaran sedang ditutup. <Link href="/masuk">Kembali ke halaman masuk</Link></p>
          ) : (
            <ActionForm action={daftar} submit="Daftar">
              <label><span className="label">Nama lengkap</span><input className="field" name="nama" autoComplete="name" required /></label>
              <label><span className="label">Email</span><input className="field" type="email" name="email" autoComplete="email" required /></label>
              <label><span className="label">Password (minimal 8 karakter)</span><input className="field" type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
              <label className="check"><input type="checkbox" name="setuju" required /><span className="t-sub">Saya setuju data CV saya disimpan untuk keperluan layanan ini.</span></label>
              <p className="t-foot muted">Akun baru dapat membuat {cfg.kuota_mandiri} CV.</p>
            </ActionForm>
          )}
          <p className="t-sub center">Sudah punya akun? <Link href="/masuk">Masuk</Link></p>
        </div>
      </GlassCard>
    </main>
  );
}
