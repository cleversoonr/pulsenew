import { QueryProvider } from "@/components/providers/query-provider";
import { SettingsShell } from "@/components/settings/meeting-types-shell";

export default function SettingsPage() {
  return (
    <QueryProvider>
      <SettingsShell />
    </QueryProvider>
  );
}
