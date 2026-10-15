import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getActor } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/masuk");
  return <Shell actor={actor}>{children}</Shell>;
}
