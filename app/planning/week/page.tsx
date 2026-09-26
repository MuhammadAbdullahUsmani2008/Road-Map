import { AppShell } from "@/components/app-shell";
import { getPlanningData } from "@/features/planning/planning-data";
import { PlanningPage } from "@/features/planning/planning-page";

export default async function PlanningWeekRoute() {
  const data = await getPlanningData();
  return <AppShell><PlanningPage data={data} view="week" /></AppShell>;
}
