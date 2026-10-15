"use server";
import { redirect } from "next/navigation";
import { createSession, destroySession, login } from "@/lib/auth";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { bool, emailValid, str } from "@/lib/form-data";
import type { FormState } from "@/lib/form";

export async function masuk(_: FormState, fd: FormData): Promise<FormState> {
  const r = await login(str(fd, "email", 200), String(fd.get("password") ?? ""));
  if (r.error) return r;
  redirect("/");
}

export async function keluar() {
  await destroySession();
  redirect("/masuk");
}

/** Klien mendaftar sendiri. Hanya jalan bila admin membuka pendaftaran di Pengaturan. */
export async function daftar(_: FormState, fd: FormData): Promise<FormState> {
  const [cfg] = await sql`select daftar_terbuka, kuota_mandiri from settings where id = 1`;
  if (!cfg?.daftar_terbuka) return { error: "Pendaftaran sedang ditutup." };
  const nama = str(fd, "nama", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const pw = String(fd.get("password") ?? "");
  if (nama.length < 2) return { error: "Isi nama lengkap." };
  if (!emailValid(email)) return { error: "Email tidak valid." };
  if (pw.length < 8) return { error: "Password minimal 8 karakter." };
  if (!bool(fd, "setuju")) return { error: "Centang persetujuan penyimpanan data untuk melanjutkan." };
  const [ada] = await sql`select 1 from users where email = ${email}`;
  if (ada) return { error: "Email ini sudah terdaftar. Silakan masuk." };

  const hash = await hashPassword(pw);
  const id = await sql.begin(async (tx) => {
    const [u] = await tx`insert into users (email, name, role, password_hash) values (${email}, ${nama}, 'klien', ${hash}) returning id`;
    const [c] = await tx`insert into clients (user_id, nama, email, setuju_at, kuota_cv) values (${u.id}, ${nama}, ${email}, now(), ${cfg.kuota_mandiri}) returning id`;
    await tx`insert into profiles (client_id, nama_lengkap, email) values (${c.id}, ${nama}, ${email})`;
    return { userId: u.id as string, clientId: c.id as string };
  });
  await createSession(id.userId);
  redirect(`/klien/${id.clientId}`);
}
