import { QueryProvider } from "@/components/providers/query-provider";
import { TaskShell } from "@/components/tasks/task-shell";

export default function TasksPage() {
  return (
    <QueryProvider>
      <TaskShell />
    </QueryProvider>
  );
}
