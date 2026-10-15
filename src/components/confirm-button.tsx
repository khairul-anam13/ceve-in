"use client";
import { btnClass } from "@/lib/ui";

/** Tombol submit yang meminta konfirmasi dulu — untuk aksi yang menghapus data. */
export function ConfirmButton({ children, message, variant = "gray", destructive = true, size = "medium" }: {
  children: React.ReactNode; message: string; variant?: "filled" | "tinted" | "gray" | "plain"; destructive?: boolean; size?: "small" | "medium";
}) {
  return (
    <button type="submit" className={btnClass(variant, size, destructive)} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
