import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { hashPassword, verifyPassword } from "./password.ts";

/** Siapa yang sedang membuka aplikasi.
 *  admin = pemilik jasa; klien = klien yang punya akun; tamu = klien yang membuka tautan isi-data (tanpa akun). */
export type Actor =
  | { kind: "admin"; userId: string; nama: string }
  | { kind: "klien"; userId: string; nama: string; clientId: string }
  | { kind: "tamu"; clientId: string; nama: string };

const SID = "ceve_sid";
const ISI = "ceve_isi";
const DAYS = 30;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await sql`delete from sessions where expires_at < now()`;
  await sql`insert into sessions (id, user_id, expires_at) values (${sha(token)}, ${userId}, now() + make_interval(days => ${DAYS}::int))`;
  (await cookies()).set(SID, token, cookieOpts(DAYS * 86400));
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(SID)?.value;
  if (t) await sql`delete from sessions where id = ${sha(t)}`;
  jar.delete(SID);
  jar.delete(ISI);
}

export const getActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  const t = jar.get(SID)?.value;
  if (t) {
    const [u] = await sql`
      select u.id, u.name, u.role, c.id as client_id
      from sessions s join users u on u.id = s.user_id left join clients c on c.user_id = u.id
      where s.id = ${sha(t)} and s.expires_at > now()`;
    if (u?.role === "admin") return { kind: "admin", userId: u.id, nama: u.name };
    if (u?.client_id) return { kind: "klien", userId: u.id, nama: u.name, clientId: u.client_id };
  }
  const isi = jar.get(ISI)?.value;
  if (isi) {
    const [l] = await sql`
      select c.id, c.nama from intake_links i join clients c on c.id = i.client_id
      where i.token = ${sha(isi)} and i.expires_at > now() and c.status = 'aktif'`;
    if (l) return { kind: "tamu", clientId: l.id, nama: l.nama };
  }
  return null;
});

/** Pasang cookie tamu setelah tautan isi-data dibuka. */
export async function startIntake(token: string): Promise<string | null> {
  const [l] = await sql`select client_id from intake_links where token = ${sha(token)} and expires_at > now()`;
  if (!l) return null;
  (await cookies()).set(ISI, token, cookieOpts(7 * 86400));
  return l.client_id as string;
}

export async function requireAdmin(): Promise<Actor & { kind: "admin" }> {
  const a = await getActor();
  if (!a) redirect("/masuk");
  if (a.kind !== "admin") redirect("/");
  return a;
}

/** Akses ke satu klien. "data" = profil + entry (tamu boleh); "cv" = CV dan order (admin & klien bertamu tidak). */
export async function requireAccess(clientId: string, need: "data" | "cv" = "cv"): Promise<Actor> {
  const a = await getActor();
  if (!a) redirect("/masuk");
  if (a.kind === "admin") return a;
  if (a.clientId !== clientId) redirect("/");
  if (a.kind === "tamu" && need === "cv") redirect(`/klien/${clientId}`);
  return a;
}

/** Id klien pemilik sebuah CV / entry / order — dipakai untuk memeriksa akses dari id anak. */
export async function clientOf(table: "cvs" | "entries" | "orders", id: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql`select client_id from ${sql(table)} where id = ${id}`;
  return (r?.client_id as string) ?? null;
}

const DUMMY = await hashPassword("dummy-untuk-menyamakan-waktu");
const MAX_FAILS = 5;

/** Login admin atau klien (email + password). Kunci 15 menit setelah 5 kali gagal. */
export async function login(email: string, password: string): Promise<{ error?: string }> {
  const [u] = await sql`select id, password_hash, failed_logins, locked_until from users where email = ${email.trim().toLowerCase()}`;
  if (u?.locked_until && u.locked_until > new Date()) return { error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY);
  if (!u || !ok) {
    if (u) await sql`update users set
      locked_until = case when failed_logins + 1 >= ${MAX_FAILS} then now() + interval '15 minutes' else locked_until end,
      failed_logins = case when failed_logins + 1 >= ${MAX_FAILS} then 0 else failed_logins + 1 end
      where id = ${u.id}`;
    return { error: "Email atau password salah." };
  }
  await sql`update users set failed_logins = 0, locked_until = null where id = ${u.id}`;
  await createSession(u.id);
  return {};
}

/** Buat tautan isi-data untuk klien (menggantikan tautan lama). Token asli hanya dikembalikan sekali; database menyimpan hash-nya. */
export async function newIntakeLink(clientId: string, days = 7): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await sql`delete from intake_links where client_id = ${clientId}`;
  await sql`insert into intake_links (token, client_id, expires_at) values (${sha(token)}, ${clientId}, now() + make_interval(days => ${days}::int))`;
  return token;
}
