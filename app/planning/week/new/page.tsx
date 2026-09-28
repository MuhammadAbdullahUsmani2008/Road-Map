import { redirect } from "next/navigation";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/app-shell";
import { getWeekBuilderData } from "@/features/planning/week-builder-data";
import { WeekBuilderPage } from "@/features/planning/week-builder-page";

export default async function WeekBuilderRoute() {
  if (!(await getAuthorizedAccess())) redirect("/login");
  const data = await getWeekBuilderData();
  return <AppShell><WeekBuilderPage data={data} /></AppShell>;
}
