"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { unggahFoto } from "@/app/aksi/data";
import { Button } from "./ios";

const LEBAR = 600;
const TINGGI = 800; // rasio 3:4, sama dengan kotak foto di CV

/** Potong tengah ke 3:4 (condong ke atas supaya kepala tidak terpotong) lalu kecilkan jadi JPEG ±100 KB. */
async function siapkan(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const rasio = LEBAR / TINGGI;
  let sw = bmp.width;
  let sh = bmp.height;
  if (sw / sh > rasio) sw = Math.round(sh * rasio);
  else sh = Math.round(sw / rasio);
  const sx = Math.round((bmp.width - sw) / 2);
  const sy = Math.round((bmp.height - sh) * 0.2);
  const lebar = Math.min(LEBAR, sw);
  const c = document.createElement("canvas");
  c.width = lebar;
  c.height = Math.round(lebar / rasio);
  const x = c.getContext("2d");
  if (!x) throw new Error("kanvas");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("kanvas"))), "image/jpeg", 0.88));
}

/** Pilih foto, lihat hasil potongannya, lalu simpan. Pengecilan dilakukan di browser agar unggahan kecil dan cepat. */
export function FotoUnggah({ clientId }: { clientId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [hasil, setHasil] = useState<{ blob: Blob; url: string } | null>(null);
  const [pesan, setPesan] = useState<{ error?: string; ok?: string }>({});
  const [bekerja, setBekerja] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => () => { if (hasil) URL.revokeObjectURL(hasil.url); }, [hasil]);

  async function pilih(file: File | undefined) {
    setPesan({});
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPesan({ error: "Pilih berkas gambar (JPG, PNG, atau WEBP)." });
    setBekerja(true);
    try {
      const blob = await siapkan(file);
      setHasil({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setPesan({ error: "Foto tidak bisa dibuka. Coba foto lain, atau simpan ulang sebagai JPG." });
    } finally {
      setBekerja(false);
    }
  }

  function simpan() {
    if (!hasil) return;
    const fd = new FormData();
    fd.append("foto", new File([hasil.blob], "foto.jpg", { type: "image/jpeg" }));
    start(async () => {
      const r = await unggahFoto(clientId, undefined, fd);
      if (r?.error) return setPesan({ error: r.error });
      setHasil(null);
      if (input.current) input.current.value = "";
      setPesan({ ok: "Foto tersimpan." });
      router.refresh();
    });
  }

  return (
    <div className="stack">
      <input ref={input} className="field" type="file" accept="image/*" aria-label="Pilih foto" onChange={(e) => pilih(e.target.files?.[0])} />
      <p className="t-foot muted">Foto apa pun dari HP boleh. Otomatis dipotong 3×4 dan dikecilkan. Latar polos dan wajah menghadap depan paling cocok.</p>
      {bekerja && <p className="t-sub">Menyiapkan foto…</p>}
      {hasil && (
        <div className="row" style={{ alignItems: "flex-end", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar" src={hasil.url} alt="Hasil potongan foto" />
          <div className="stack">
            <span className="t-foot muted">Hasil potongan, {Math.round(hasil.blob.size / 1024)} KB</span>
            <Button variant="filled" size="medium" onClick={simpan} disabled={pending}>{pending ? "Menyimpan…" : "Simpan foto"}</Button>
          </div>
        </div>
      )}
      {pesan.error && <p className="err" role="alert">{pesan.error}</p>}
      {pesan.ok && <p className="ok" role="status">{pesan.ok}</p>}
    </div>
  );
}
