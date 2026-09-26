import { AppShell } from "@/components/app-shell";
import { getYoutubeData } from "@/features/youtube/youtube-data";
import { YoutubePage } from "@/features/youtube/youtube-page";

export default async function YoutubePipelineRoute() {
  const data = await getYoutubeData();
  return <AppShell><YoutubePage data={data} view="pipeline" /></AppShell>;
}
