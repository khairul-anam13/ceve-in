import assert from "node:assert/strict";
import { test } from "node:test";
import { cocokkanLowongan, periksaCv } from "../src/lib/ats.ts";
import { barisTeks, urutanBagian, type CvData } from "../src/lib/cv-types.ts";
import { bulanTahun, periode, tanggalPanjang } from "../src/lib/format.ts";
import { renderHtml } from "../src/lib/render-html.ts";

const cv: CvData = {
  clientId: "c1", nama: "Sari <Dewi>", target: "Staf Administrasi",
  kontak: { hp: "0812", email: "sari@contoh.id", alamat: "", kota: "Semarang", linkedin: "" },
  foto: false, ringkasan: "Berpengalaman mengelola arsip dan Microsoft Excel.", pribadi: [], template: "klasik",
  bagian: [
    { tipe: "kerja", items: [{ entryId: "e1", judul: "Admin", instansi: "PT Maju", lokasi: "Semarang", mulai: "2021-01-01", selesai: null, berjalan: true, butir: ["Mengelola arsip surat masuk"], deskripsi: "" }] },
    { tipe: "skill", items: [{ entryId: "e2", judul: "Microsoft Excel", instansi: "", lokasi: "", mulai: null, selesai: null, berjalan: false, butir: [], deskripsi: "Mahir" }] },
  ],
  pengaturan: { label: "CV Admin", pakaiFoto: false, pakaiDataPribadi: false, ringkasanOverride: null, urutanBagian: null },
};

test("format tanggal", () => {
  assert.equal(bulanTahun("2024-03-01"), "Mar 2024");
  assert.equal(tanggalPanjang("1998-05-12"), "12 Mei 1998");
  assert.equal(periode("2021-01-01", null, true), "Jan 2021 – Sekarang");
  assert.equal(periode("2021-01-01", "2022-06-01", false), "Jan 2021 – Jun 2022");
});

test("urutan bagian: khusus CV didahulukan, sisanya ikut template", () => {
  assert.deepEqual(urutanBagian("lulusan", null).slice(0, 2), ["pendidikan", "magang"]);
  assert.deepEqual(urutanBagian("klasik", ["skill"]).slice(0, 2), ["skill", "kerja"]);
});

test("HTML aman dari injeksi dan tanpa tabel", () => {
  const h = renderHtml(cv);
  assert.ok(h.includes("Sari &lt;Dewi&gt;"));
  assert.ok(!h.includes("<table"));
  assert.ok(h.includes("Pengalaman Kerja") && h.includes("Microsoft Excel (Mahir)"));
});

test("pemeriksaan ATS menandai data yang kurang", () => {
  const t = periksaCv({ ...cv, kontak: { ...cv.kontak, hp: "", email: "" } });
  assert.ok(t.some((x) => x.tingkat === "peringatan" && x.teks.includes("menghubungi")));
  assert.ok(t.some((x) => x.teks.includes("pendidikan")));
});

test("kecocokan lowongan: kata kunci yang ada dan belum ada", () => {
  const r = cocokkanLowongan(cv, "Dicari staf administrasi. Menguasai Excel, Word, dan arsip. Excel wajib. Kemampuan negosiasi.");
  assert.ok(r.ada.includes("excel") && r.ada.includes("arsip"));
  assert.ok(r.belum.includes("negosiasi"));
  assert.ok(r.persen > 0 && r.persen < 100);
  assert.ok(barisTeks(cv).length > 3);
});
