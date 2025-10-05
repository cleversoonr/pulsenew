import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingTypesApi } from "@/lib/meeting-types-api";
import type {
  CreateMeetingTypeInput,
  MeetingType,
  UpdateMeetingTypeInput,
} from "@/lib/meetings-types";

const meetingTypesKey = (accountId?: string, includeInactive = true) => [
  "meeting-types",
  accountId ?? null,
  includeInactive,
];

export function useMeetingTypes(accountId?: string, includeInactive = true) {
  return useQuery<MeetingType[]>({
    queryKey: meetingTypesKey(accountId, includeInactive),
    queryFn: () => meetingTypesApi.list(accountId!, includeInactive),
    enabled: Boolean(accountId),
  });
}

export function useCreateMeetingType(accountId?: string, includeInactive = true) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingTypeInput) => meetingTypesApi.create(payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingTypesKey(accountId, includeInactive) });
      }
    },
  });
}

export function useUpdateMeetingType(accountId?: string, includeInactive = true) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meetingTypeId,
      payload,
    }: {
      meetingTypeId: string;
      payload: UpdateMeetingTypeInput;
    }) => meetingTypesApi.update(meetingTypeId, payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingTypesKey(accountId, includeInactive) });
      }
    },
  });
}

export function useDeleteMeetingType(accountId?: string, includeInactive = true) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingTypeId: string) => meetingTypesApi.delete(meetingTypeId),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: meetingTypesKey(accountId, includeInactive) });
      }
    },
  });
}
