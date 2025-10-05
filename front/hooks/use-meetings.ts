import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/meetings-api";
import type {
  CreateMeetingInput,
  Meeting,
  MeetingQueryFilters,
  UpdateMeetingInput,
} from "@/lib/meetings-types";

const meetingsKey = (
  accountId?: string,
  filters?: MeetingQueryFilters
) =>
  accountId
    ? [
        "meetings",
        accountId,
        filters?.meeting_type_id ?? null,
        filters?.project_id ?? null,
      ]
    : ["meetings"];

export function useMeetings(accountId?: string, filters?: MeetingQueryFilters) {
  return useQuery<Meeting[]>({
    queryKey: meetingsKey(accountId, filters),
    queryFn: () => meetingsApi.list(accountId!, filters),
    enabled: Boolean(accountId),
  });
}

export function useCreateMeeting(accountId?: string, filters?: MeetingQueryFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingInput) => meetingsApi.create(payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingsKey(accountId, filters) });
      }
    },
  });
}

export function useUpdateMeeting(accountId?: string, filters?: MeetingQueryFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, payload }: { meetingId: string; payload: UpdateMeetingInput }) =>
      meetingsApi.update(meetingId, payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingsKey(accountId, filters) });
      }
    },
  });
}

export function useDeleteMeeting(accountId?: string, filters?: MeetingQueryFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => meetingsApi.delete(meetingId, accountId!),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingsKey(accountId, filters) });
      }
    },
  });
}
