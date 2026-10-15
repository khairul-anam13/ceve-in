// CV → HTML. Satu sumber untuk preview di editor dan PDF. Sengaja satu kolom, tanpa tabel/ikon/gambar dekoratif (ramah ATS).
import { periode } from "./format.ts";
import { FIELD, HEADING, isTemplate, type CvData, type Item, type TemplateKey } from "./cv-types.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Gaya = { font: string; ukuran: number; rapat: number; judul: string; garis: boolean; tengah: boolean };
const GAYA: Record<TemplateKey, Gaya> = {
  klasik: { font: "'Times New Roman', Times, 'Liberation Serif', serif", ukuran: 11, rapat: 1, judul: "Times New Roman", garis: true, tengah: true },
  ringkas: { font: "Arial, Helvetica, 'Liberation Sans', sans-serif", ukuran: 10, rapat: 0.78, judul: "Arial", garis: true, tengah: false },
  lulusan: { font: "Calibri, Carlito, Arial, 'Liberation Sans', sans-serif", ukuran: 11, rapat: 0.95, judul: "Calibri", garis: false, tengah: false },
};

function css(g: Gaya, kertas: boolean): string {
  const m = (px: number) => `${(px * g.rapat).toFixed(1)}px`;
  return `
@page { size: A4; margin: 16mm 18mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${g.font}; font-size: ${g.ukuran}pt; line-height: 1.38; color: #111; background: #fff; }
.cv { color: #111; }
header { ${g.tengah ? "text-align: center;" : ""} margin-bottom: ${m(12)}; overflow: hidden; }
.foto { float: right; width: 30mm; height: 40mm; object-fit: cover; margin: 0 0 ${m(6)} ${m(14)}; }
h1 { margin: 0; font-size: ${g.ukuran + 9}pt; line-height: 1.15; font-weight: 700; letter-spacing: 0.2px; }
.target { margin: ${m(3)} 0 0; font-size: ${g.ukuran + 1.5}pt; }
.kontak { margin: ${m(4)} 0 0; }
.pribadi { margin: ${m(6)} 0 0; }
.pribadi p { margin: 0; }
h2 { margin: ${m(14)} 0 ${m(6)}; font-size: ${g.ukuran + 0.5}pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; ${g.garis ? "border-bottom: 1px solid #111; padding-bottom: 2px;" : "color: #1f3a8a;"} }
p { margin: 0 0 ${m(5)}; }
article { margin: 0 0 ${m(8)}; break-inside: avoid; }
.baris { display: flex; justify-content: space-between; gap: 12px; }
.baris strong { font-weight: 700; }
.periode { white-space: nowrap; }
.sub { font-style: italic; }
ul { margin: ${m(3)} 0 0; padding-left: 18px; }
li { margin: 0 0 ${m(2)}; }
@media screen {
${kertas
    ? `  body { background: #fff; }
  .cv { width: 210mm; min-height: 297mm; padding: 16mm 18mm; }`
    : `  body { background: #d1d1d6; padding: 18px 0; }
  .cv { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 18mm; background: #fff; box-shadow: 0 6px 28px rgba(0,0,0,.22); }`}
}
`;
}

function periodeItem(tipe: keyof typeof FIELD, it: Item): string {
  const t = FIELD[tipe].tanggal;
  if (t === "tidak") return "";
  if (t === "satu") return periode(it.mulai, null, false);
  return periode(it.mulai, it.selesai, it.berjalan);
}

function artikel(tipe: keyof typeof FIELD, it: Item): string {
  const per = periodeItem(tipe, it);
  const sub = [it.instansi, it.lokasi].filter(Boolean).join(", ");
  return `<article>
<div class="baris"><strong>${esc(it.judul)}</strong>${per ? `<span class="periode">${esc(per)}</span>` : ""}</div>
${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
${it.deskripsi ? `<p>${esc(it.deskripsi)}</p>` : ""}
${it.butir.length ? `<ul>${it.butir.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
</article>`;
}

/** Keahlian dan bahasa: satu paragraf berisi daftar dipisah koma, supaya terbaca sebagai teks biasa oleh ATS. */
const daftar = (items: Item[]) => items.map((i) => (i.deskripsi ? `${i.judul} (${i.deskripsi})` : i.judul)).join(", ");

/** kertas: untuk pratinjau di editor — halaman putih polos selebar A4 yang diskalakan oleh pembungkusnya. */
export function renderHtml(d: CvData, foto?: string | null, kertas = false): string {
  const g = GAYA[isTemplate(d.template) ? d.template : "klasik"];
  const kontak = [d.kontak.hp, d.kontak.email, [d.kontak.alamat, d.kontak.kota].filter(Boolean).join(", "), d.kontak.linkedin].filter(Boolean);
  const bagian = d.bagian.map((b) => {
    const isi = b.tipe === "skill" || b.tipe === "bahasa" ? `<p>${esc(daftar(b.items))}</p>` : b.items.map((i) => artikel(b.tipe, i)).join("\n");
    return `<section><h2>${HEADING[b.tipe]}</h2>\n${isi}</section>`;
  });
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.nama)} - CV</title><style>${css(g, kertas)}</style></head>
<body><main class="cv">
<header>
${foto && d.foto ? `<img class="foto" src="${foto}" alt="Foto ${esc(d.nama)}">` : ""}
<h1>${esc(d.nama)}</h1>
${d.target ? `<p class="target">${esc(d.target)}</p>` : ""}
${kontak.length ? `<p class="kontak">${kontak.map(esc).join(" | ")}</p>` : ""}
${d.pribadi.length ? `<div class="pribadi">${d.pribadi.map((p) => `<p>${esc(p.label)}: ${esc(p.nilai)}</p>`).join("")}</div>` : ""}
</header>
${d.ringkasan ? `<section><h2>Ringkasan Profil</h2><p>${esc(d.ringkasan)}</p></section>` : ""}
${bagian.join("\n")}
</main></body></html>`;
}
