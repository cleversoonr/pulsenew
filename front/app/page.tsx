import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export default function Home() {
  return (
    <QueryProvider>
      <DashboardShell />
    </QueryProvider>
  );
}
