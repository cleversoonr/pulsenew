import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sprintsApi } from "@/lib/sprints-api";
import type { CreateSprintInput, UpdateSprintInput } from "@/lib/sprints-types";

export function useSprints(
  accountId?: string,
  projectId?: string | null,
  status?: string,
  withoutProject = false
) {
  return useQuery({
    queryKey: ["sprints", accountId, projectId, status, withoutProject],
    queryFn: () => sprintsApi.list(accountId!, projectId ?? null, status, withoutProject),
    enabled: Boolean(accountId),
  });
}

export function useAvailableTasks(accountId?: string, projectId?: string | null, status?: string) {
  return useQuery({
    queryKey: ["sprint-tasks", accountId, projectId, status],
    queryFn: () => sprintsApi.tasks(accountId!, projectId!, status),
    enabled: Boolean(accountId && projectId),
  });
}

export function useCreateSprint(
  accountId?: string,
  projectId?: string | null,
  status?: string,
  withoutProject = false
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSprintInput) => sprintsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", accountId, projectId, status, withoutProject] });
    },
  });
}

export function useUpdateSprint(
  accountId?: string,
  projectId?: string | null,
  status?: string,
  withoutProject = false
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, payload }: { sprintId: string; payload: UpdateSprintInput }) =>
      sprintsApi.update(sprintId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", accountId, projectId, status, withoutProject] });
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] });
    },
  });
}

export function useDeleteSprint(
  accountId?: string,
  projectId?: string | null,
  status?: string,
  withoutProject = false
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.remove(sprintId),
    onSuccess: (_, sprintId) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", accountId, projectId, status, withoutProject] });
      queryClient.removeQueries({ queryKey: ["sprint", sprintId] });
    },
  });
}

export function useSprint(sprintId?: string) {
  return useQuery({
    queryKey: ["sprint", sprintId],
    queryFn: () => sprintsApi.detail(sprintId!),
    enabled: Boolean(sprintId),
  });
}
