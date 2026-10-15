"use client";
import { useState, useTransition } from "react";
import { cekLowongan, type HasilCek } from "@/app/aksi/cv";
import { Button } from "./ios";

/** Tempel teks lowongan, lihat kata kunci yang sudah dan belum ada di CV. Kata kunci diambil dari isi CV yang tersimpan. */
export function LowonganCek({ cvId }: { cvId: string }) {
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilCek | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="stack">
      <textarea className="field" rows={5} value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Tempel deskripsi lowongan di sini" aria-label="Teks lowongan" />
      <div className="row">
        <Button size="medium" variant="tinted" disabled={pending || teks.trim().length < 20} onClick={() => start(async () => setHasil(await cekLowongan(cvId, teks)))}>
          {pending ? "Memeriksa…" : "Cocokkan"}
        </Button>
        {hasil && <span className="t-sub">{hasil.persen}% kata kunci sudah ada</span>}
      </div>
      {hasil && (
        <div className="stack">
          {hasil.belum.length > 0 && (
            <div>
              <p className="label">Belum ada di CV — tambahkan bila memang Anda kuasai</p>
              <div className="kata">{hasil.belum.map((k) => <span key={k} className="badge badge--orange">{k}</span>)}</div>
            </div>
          )}
          {hasil.ada.length > 0 && (
            <div>
              <p className="label">Sudah ada</p>
              <div className="kata">{hasil.ada.map((k) => <span key={k} className="badge badge--green">{k}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
