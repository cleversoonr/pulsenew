import { apiFetch } from "@/lib/api-client";
import type { CreateMeetingInput, Meeting } from "@/lib/meetings-types";

export const meetingsApi = {
  list: (tenantId: string, projectId?: string) =>
    apiFetch<Meeting[]>(`/api/meetings?tenant_id=${encodeURIComponent(tenantId)}${projectId ? `&project_id=${encodeURIComponent(projectId)}` : ""}`),
  create: (payload: CreateMeetingInput) =>
    apiFetch<Meeting>(`/api/meetings`, { method: "POST", body: payload }),
};
