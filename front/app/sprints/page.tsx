import { QueryProvider } from "@/components/providers/query-provider";
import { SprintShell } from "@/components/sprints/sprint-shell";

export default function SprintsPage() {
  return (
    <QueryProvider>
      <SprintShell />
    </QueryProvider>
  );
}
