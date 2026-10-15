import type { NextRequest } from "next/server";
import { clientOf, getActor } from "@/lib/auth";
import { loadCvData, loadFoto } from "@/lib/cv";
import { renderDocx } from "@/lib/render-docx";
import { renderHtml } from "@/lib/render-html";
import { htmlToPdf } from "@/lib/render-pdf";

const slug = (s: string) => s.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "cv";
const TIDAK = () => new Response("Tidak ditemukan", { status: 404 });

/** GET /api/cv/:id/html|pdf|docx[?versi=N][&unduh=1] — html untuk preview, pdf dan docx untuk berkas. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; format: string }> }) {
  const { id, format } = await params;
  const clientId = await clientOf("cvs", id);
  const a = await getActor();
  if (!clientId || !a || a.kind === "tamu" || (a.kind === "klien" && a.clientId !== clientId)) return TIDAK();

  const versi = Number(req.nextUrl.searchParams.get("versi")) || null;
  const data = await loadCvData(id, versi);
  if (!data) return TIDAK();

  const nama = `CV-${slug(data.nama)}-${slug(data.pengaturan.label)}${versi ? `-v${versi}` : ""}`;
  const unduh = req.nextUrl.searchParams.get("unduh") === "1";
  const kepala = (type: string, ext: string) => ({
    "content-type": type,
    "cache-control": "no-store",
    "content-disposition": `${unduh || ext === "docx" ? "attachment" : "inline"}; filename="${nama}.${ext}"`,
  });

  if (format === "html") {
    const html = renderHtml(data, data.foto ? await loadFoto(data.clientId) : null, req.nextUrl.searchParams.get("kertas") === "1");
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  if (format === "pdf") {
    const pdf = await htmlToPdf(renderHtml(data, data.foto ? await loadFoto(data.clientId) : null));
    return new Response(new Uint8Array(pdf), { headers: kepala("application/pdf", "pdf") });
  }
  if (format === "docx") {
    const docx = await renderDocx(data);
    return new Response(new Uint8Array(docx), { headers: kepala("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx") });
  }
  return TIDAK();
}
