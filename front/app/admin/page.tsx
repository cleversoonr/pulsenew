import { QueryProvider } from "@/components/providers/query-provider";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminPage() {
  return (
    <QueryProvider>
      <AdminShell />
    </QueryProvider>
  );
}
