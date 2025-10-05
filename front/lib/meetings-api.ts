import { apiFetch } from "@/lib/api-client";
import type {
  CreateMeetingInput,
  Meeting,
  MeetingQueryFilters,
  UpdateMeetingInput,
} from "@/lib/meetings-types";

export const meetingsApi = {
  list: (accountId: string, filters: MeetingQueryFilters = {}) => {
    const params = new URLSearchParams({ account_id: accountId });
    if (filters.meeting_type_id) params.append("meeting_type_id", filters.meeting_type_id);
    if (filters.project_id) params.append("project_id", filters.project_id);
    return apiFetch<Meeting[]>(`/api/meetings?${params.toString()}`);
  },
  create: (payload: CreateMeetingInput) =>
    apiFetch<Meeting>(`/api/meetings`, { method: "POST", body: payload }),
  update: (meetingId: string, payload: UpdateMeetingInput) =>
    apiFetch<Meeting>(`/api/meetings/${meetingId}`, { method: "PUT", body: payload }),
  delete: (meetingId: string, accountId: string) =>
    apiFetch<void>(`/api/meetings/${meetingId}?account_id=${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    }),
};
