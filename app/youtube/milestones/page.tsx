import { AppShell } from "@/components/app-shell";
import { getYoutubeData } from "@/features/youtube/youtube-data";
import { YoutubePage } from "@/features/youtube/youtube-page";

export default async function YoutubeMilestonesRoute() {
  const data = await getYoutubeData();
  return <AppShell><YoutubePage data={data} view="milestones" /></AppShell>;
}
