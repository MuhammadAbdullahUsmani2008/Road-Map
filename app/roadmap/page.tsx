import { AppShell } from "@/components/app-shell";
import { getRoadmapData } from "@/features/roadmap/roadmap-data";
import { RoadmapPage } from "@/features/roadmap/roadmap-page";

export default async function RoadmapRoute() {
  const data = await getRoadmapData();
  return <AppShell><RoadmapPage data={data} /></AppShell>;
}
