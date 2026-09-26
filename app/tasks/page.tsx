import { AppShell } from "@/components/app-shell";
import { getTasksData } from "@/features/tasks/tasks-data";
import { TasksPage } from "@/features/tasks/tasks-page";

const filters = ["today", "overdue", "upcoming", "all", "completed"] as const;
type TaskFilter = (typeof filters)[number];

type TasksRouteProps = { searchParams: Promise<{ filter?: string; task?: string }> };

export default async function TasksRoute({ searchParams }: TasksRouteProps) {
  const params = await searchParams;
  const filter = params.task ? "all" : filters.includes(params.filter as TaskFilter) ? params.filter as TaskFilter : "today";
  const data = await getTasksData();

  return <AppShell><TasksPage data={data} initialFilter={filter} selectedTaskId={params.task} /></AppShell>;
}
