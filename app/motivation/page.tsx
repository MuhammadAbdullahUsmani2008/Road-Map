import { AppShell } from "@/components/app-shell";
import { MotivationPage } from "@/features/motivation/motivation-page";
import { getMotivationData } from "@/features/motivation/motivation-data";

export default async function MotivationRoute() {
  const data = await getMotivationData();
  return <AppShell><MotivationPage data={data} /></AppShell>;
}
