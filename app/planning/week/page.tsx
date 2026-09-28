import { AppShell } from "@/components/app-shell";
import { getWeeklyCommandData } from "@/features/planning/weekly-command-data";
import { WeeklyCommandPage } from "@/features/planning/weekly-command-page";

type PlanningWeekRouteProps = {
  searchParams?: Promise<{ week?: string }>;
};

export default async function PlanningWeekRoute({ searchParams }: PlanningWeekRouteProps) {
  const params = await searchParams;
  const data = await getWeeklyCommandData(params?.week);
  return (
    <AppShell>
      <WeeklyCommandPage data={data} />
    </AppShell>
  );
}
