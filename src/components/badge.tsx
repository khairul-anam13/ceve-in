import { STATUS_ORDER } from "@/lib/format";

const WARNA: Record<string, string> = { baru: "badge--tint", data: "badge--orange", draf: "badge--orange", revisi: "badge--red", selesai: "badge--green", batal: "" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${WARNA[status] ?? ""}`}>{STATUS_ORDER[status] ?? status}</span>;
}
