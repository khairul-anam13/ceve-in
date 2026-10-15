import { NextResponse, type NextRequest } from "next/server";
import { startIntake } from "@/lib/auth";

/** Tautan isi-data dari admin: pasang cookie tamu lalu buka halaman klien. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clientId = await startIntake(token);
  const to = clientId ? `/klien/${clientId}` : "/masuk?isi=gagal";
  return NextResponse.redirect(new URL(to, req.url));
}
