import { AlignmentType, Document, Packer, Paragraph, Tab, TabStopPosition, TabStopType, TextRun } from "docx";
import { periode } from "./format.ts";
import { FIELD, HEADING, isTemplate, type CvData, type Item } from "./cv-types.ts";

type Run = (text: string, o?: { bold?: boolean; italics?: boolean; size?: number; tab?: boolean }) => TextRun;
const FONT = { klasik: "Times New Roman", ringkas: "Arial", lulusan: "Calibri" } as const;
const UKURAN = { klasik: 22, ringkas: 20, lulusan: 22 } as const; // setengah poin

/** CV → DOCX yang bisa diedit. Satu kolom, tanpa tabel. Foto tidak disertakan. */
export async function renderDocx(d: CvData): Promise<Buffer> {
  const key = isTemplate(d.template) ? d.template : "klasik";
  const font = FONT[key];
  const size = UKURAN[key];
  const tengah = key === "klasik";
  const run: Run = (text, o = {}) => new TextRun({ ...(o.tab ? { children: [new Tab(), text] } : { text }), font, size: o.size ?? size, bold: o.bold, italics: o.italics });

  const out: Paragraph[] = [];
  out.push(new Paragraph({ alignment: tengah ? AlignmentType.CENTER : AlignmentType.LEFT, children: [run(d.nama, { bold: true, size: size + 18 })] }));
  if (d.target) out.push(new Paragraph({ alignment: tengah ? AlignmentType.CENTER : AlignmentType.LEFT, children: [run(d.target, { size: size + 3 })] }));
  const kontak = [d.kontak.hp, d.kontak.email, [d.kontak.alamat, d.kontak.kota].filter(Boolean).join(", "), d.kontak.linkedin].filter(Boolean);
  if (kontak.length) out.push(new Paragraph({ alignment: tengah ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 80 }, children: [run(kontak.join(" | "))] }));
  for (const p of d.pribadi) out.push(new Paragraph({ children: [run(`${p.label}: ${p.nilai}`)] }));

  const heading = (teks: string) =>
    new Paragraph({ spacing: { before: 260, after: 100 }, border: { bottom: { style: "single", size: 6, color: "111111", space: 1 } }, children: [run(teks.toUpperCase(), { bold: true })] });

  if (d.ringkasan) {
    out.push(heading("Ringkasan Profil"));
    out.push(new Paragraph({ children: [run(d.ringkasan)] }));
  }
  for (const b of d.bagian) {
    out.push(heading(HEADING[b.tipe]));
    if (b.tipe === "skill" || b.tipe === "bahasa") {
      out.push(new Paragraph({ children: [run(b.items.map((i) => (i.deskripsi ? `${i.judul} (${i.deskripsi})` : i.judul)).join(", "))] }));
      continue;
    }
    for (const it of b.items) out.push(...artikel(b.tipe, it, run));
  }

  const doc = new Document({
    creator: "CEVE-IN",
    title: `${d.nama} - CV`,
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children: out }],
  });
  return Packer.toBuffer(doc);
}

function artikel(tipe: keyof typeof FIELD, it: Item, run: Run): Paragraph[] {
  const t = FIELD[tipe].tanggal;
  const per = t === "tidak" ? "" : t === "satu" ? periode(it.mulai, null, false) : periode(it.mulai, it.selesai, it.berjalan);
  const out: Paragraph[] = [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 100 },
      keepNext: true,
      children: [run(it.judul, { bold: true }), ...(per ? [run(per, { tab: true })] : [])],
    }),
  ];
  const sub = [it.instansi, it.lokasi].filter(Boolean).join(", ");
  if (sub) out.push(new Paragraph({ children: [run(sub, { italics: true })] }));
  if (it.deskripsi) out.push(new Paragraph({ children: [run(it.deskripsi)] }));
  for (const b of it.butir) out.push(new Paragraph({ bullet: { level: 0 }, children: [run(b)] }));
  return out;
}
