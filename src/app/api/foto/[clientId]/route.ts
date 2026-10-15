import { getActor } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const a = await getActor();
  if (!a || (a.kind !== "admin" && a.clientId !== clientId)) return new Response("Tidak ditemukan", { status: 404 });
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return new Response("Tidak ditemukan", { status: 404 });
  const [p] = await sql`select foto_data, foto_tipe from profiles where client_id = ${clientId}`;
  if (!p?.foto_data) return new Response("Tidak ditemukan", { status: 404 });
  return new Response(new Uint8Array(p.foto_data), { headers: { "content-type": p.foto_tipe ?? "image/jpeg", "cache-control": "private, no-cache" } });
}
