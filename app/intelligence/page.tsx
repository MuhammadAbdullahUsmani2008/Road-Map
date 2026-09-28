import { redirect } from "next/navigation";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/app-shell";
import { getIntelligenceData, type IntelligencePeriod } from "@/features/intelligence/intelligence-data";
import { IntelligencePage } from "@/features/intelligence/intelligence-page";

const validPeriods: IntelligencePeriod[] = ["current-week", "previous-week", "current-month", "previous-month"];

type IntelligenceRouteProps = { searchParams: Promise<{ period?: string }> };

export default async function IntelligenceRoute({ searchParams }: IntelligenceRouteProps) {
  if (!(await getAuthorizedAccess())) redirect("/login");
  const params = await searchParams;
  const period: IntelligencePeriod = validPeriods.includes(params.period as IntelligencePeriod) ? (params.period as IntelligencePeriod) : "current-week";
  const data = await getIntelligenceData(period);
  return <AppShell><IntelligencePage data={data} period={period} /></AppShell>;
}
