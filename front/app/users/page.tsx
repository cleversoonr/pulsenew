import { QueryProvider } from "@/components/providers/query-provider";
import { UserShell } from "@/components/users/user-shell";

export default function UsersPage() {
  return (
    <QueryProvider>
      <UserShell />
    </QueryProvider>
  );
}
