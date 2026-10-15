import { buatKlien } from "@/app/aksi/data";
import { ActionForm } from "@/components/action-form";
import { GlassCard, NavigationBar } from "@/components/ios";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Klien baru" };

export default async function KlienBaru() {
  await requireAdmin();
  return (
    <div className="narrow stack-lg">
      <NavigationBar large title="Klien baru" backLabel="Klien" backHref="/klien" />
      <GlassCard>
        <ActionForm action={buatKlien} submit="Buat klien">
          <label><span className="label">Nama</span><input className="field" name="nama" required autoFocus /></label>
          <div className="grid-2">
            <label><span className="label">Nomor HP / WhatsApp</span><input className="field" name="hp" inputMode="tel" /></label>
            <label><span className="label">Email</span><input className="field" type="email" name="email" /></label>
          </div>
          <label className="check"><input type="checkbox" name="setuju" /><span className="t-sub">Klien sudah setuju datanya disimpan untuk pembuatan CV</span></label>
        </ActionForm>
      </GlassCard>
    </div>
  );
}
