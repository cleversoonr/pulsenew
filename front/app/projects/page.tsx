import { QueryProvider } from "@/components/providers/query-provider";
import { ProjectShell } from "@/components/projects/project-shell";

export default function ProjectsPage() {
  return (
    <QueryProvider>
      <ProjectShell />
    </QueryProvider>
  );
}
