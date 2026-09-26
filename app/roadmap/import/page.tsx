import { redirect } from "next/navigation";
import { getAuthorizedAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/app-shell";
import { RoadmapImportPage } from "@/features/roadmap/roadmap-import-page";

export default async function RoadmapImportRoute() {
  if (!(await getAuthorizedAccess())) redirect("/login");
  return <AppShell><RoadmapImportPage /></AppShell>;
}
