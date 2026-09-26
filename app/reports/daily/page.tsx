import { AppShell } from "@/components/app-shell";
import { getReportsData } from "@/features/reports/reports-data";
import { ReportsPage } from "@/features/reports/reports-page";

export default async function ReportsDailyRoute() {
  const data = await getReportsData();
  return <AppShell><ReportsPage data={data} view="daily" /></AppShell>;
}
