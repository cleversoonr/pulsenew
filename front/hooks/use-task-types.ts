import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskTypesApi } from "@/lib/task-types-api";
import type { CreateTaskTypeInput, TaskType, UpdateTaskTypeInput } from "@/lib/task-types";

const taskTypesKey = (accountId?: string) => ["task-types", accountId ?? null];

export function useTaskTypes(accountId?: string) {
  return useQuery<TaskType[]>({
    queryKey: taskTypesKey(accountId),
    queryFn: () => taskTypesApi.list(accountId!),
    enabled: Boolean(accountId),
  });
}

export function useCreateTaskType(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskTypeInput) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para cadastrar tipos de tarefa");
      }
      return taskTypesApi.create(payload);
    },
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: taskTypesKey(accountId) });
      }
    },
  });
}

export function useUpdateTaskType(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskTypeId, payload }: { taskTypeId: string; payload: UpdateTaskTypeInput }) =>
      accountId
        ? taskTypesApi.update(accountId, taskTypeId, payload)
        : Promise.reject(new Error("Selecione uma conta para atualizar tipos de tarefa")),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: taskTypesKey(accountId) });
      }
    },
  });
}

export function useDeleteTaskType(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskTypeId: string) =>
      accountId
        ? taskTypesApi.delete(accountId, taskTypeId)
        : Promise.reject(new Error("Selecione uma conta para remover tipos de tarefa")),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: taskTypesKey(accountId) });
      }
    },
  });
}
