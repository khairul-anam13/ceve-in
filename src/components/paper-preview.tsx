"use client";
import { useEffect, useRef, useState } from "react";

const LEBAR = 794; // 210 mm pada 96 dpi
const TINGGI = 1123; // 297 mm

/** Pratinjau CV selebar A4 yang diskalakan mengikuti lebar kolom, supaya tata letaknya sama dengan PDF. */
export function PaperPreview({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [skala, setSkala] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ukur = () => setSkala(Math.min(1, el.clientWidth / LEBAR));
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="paper" style={{ height: TINGGI * skala }}>
      <iframe title="Pratinjau CV" src={src} style={{ width: LEBAR, height: TINGGI, transform: `scale(${skala})` }} />
    </div>
  );
}
