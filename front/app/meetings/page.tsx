import { QueryProvider } from "@/components/providers/query-provider";
import { MeetingShell } from "@/components/meetings/meeting-shell";

export default function MeetingsPage() {
  return (
    <QueryProvider>
      <MeetingShell />
    </QueryProvider>
  );
}
