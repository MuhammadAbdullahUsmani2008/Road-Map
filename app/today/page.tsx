import { AppShell } from "@/components/app-shell";
import { getTodayData } from "@/features/today/today-data";
import { TodayPage } from "@/features/today/today-page";

export default async function TodayRoute() {
  const data = await getTodayData();
  return <AppShell><TodayPage data={data} /></AppShell>;
}
