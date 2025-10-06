import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as areasApi from "@/lib/areas-api";
import type { CreateAreaInput, UpdateAreaInput } from "@/lib/areas-types";

export function useAreas(accountId: string | undefined) {
  return useQuery({
    queryKey: ["areas", accountId],
    queryFn: () => areasApi.fetchAreas(accountId!),
    enabled: !!accountId,
  });
}

export function useArea(accountId: string | undefined, areaId: string | undefined) {
  return useQuery({
    queryKey: ["areas", accountId, areaId],
    queryFn: () => areasApi.fetchArea(accountId!, areaId!),
    enabled: !!accountId && !!areaId,
  });
}

export function useCreateArea(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAreaInput) => areasApi.createArea(accountId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", accountId] });
    },
  });
}

export function useUpdateArea(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ areaId, payload }: { areaId: string; payload: UpdateAreaInput }) =>
      areasApi.updateArea(accountId!, areaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", accountId] });
    },
  });
}

export function useDeleteArea(accountId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (areaId: string) => areasApi.deleteArea(accountId!, areaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", accountId] });
    },
  });
}
