import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/meetings-api";
import type { CreateMeetingInput, Meeting } from "@/lib/meetings-types";

const meetingsKey = (tenantId?: string, projectId?: string) =>
  tenantId ? (["meetings", tenantId, projectId] as const) : ([] as const);

export function useMeetings(tenantId?: string, projectId?: string) {
  return useQuery<Meeting[]>({
    queryKey: meetingsKey(tenantId, projectId),
    queryFn: () => meetingsApi.list(tenantId!, projectId),
    enabled: Boolean(tenantId),
  });
}

export function useCreateMeeting(tenantId?: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingInput) => meetingsApi.create(payload),
    onSuccess: () => {
      if (tenantId) queryClient.invalidateQueries({ queryKey: meetingsKey(tenantId, projectId) });
    },
  });
}
