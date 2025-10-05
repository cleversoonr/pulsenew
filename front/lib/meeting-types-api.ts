import { apiFetch } from "@/lib/api-client";
import type {
  CreateMeetingTypeInput,
  MeetingType,
  UpdateMeetingTypeInput,
} from "@/lib/meetings-types";

export const meetingTypesApi = {
  list: (accountId: string, includeInactive = true) => {
    const params = new URLSearchParams({ account_id: accountId, include_inactive: String(includeInactive) });
    return apiFetch<MeetingType[]>(`/api/meeting-types?${params.toString()}`);
  },
  create: (payload: CreateMeetingTypeInput) =>
    apiFetch<MeetingType>(`/api/meeting-types`, { method: "POST", body: payload }),
  update: (meetingTypeId: string, payload: UpdateMeetingTypeInput) =>
    apiFetch<MeetingType>(`/api/meeting-types/${meetingTypeId}`, { method: "PUT", body: payload }),
  delete: (meetingTypeId: string) =>
    apiFetch<void>(`/api/meeting-types/${meetingTypeId}`, { method: "DELETE" }),
};
