import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/tasks-api";
import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from "@/lib/tasks";

const tasksKey = (accountId?: string, filters?: TaskFilters) => [
  "tasks",
  accountId ?? null,
  filters?.project_id ?? null,
  filters?.status ?? null,
  filters?.priority ?? null,
];

export function useTasks(accountId?: string, filters?: TaskFilters) {
  return useQuery<Task[]>({
    queryKey: tasksKey(accountId, filters),
    queryFn: () => tasksApi.list(accountId!, filters),
    enabled: Boolean(accountId),
  });
}

export function useCreateTask(accountId?: string, filters?: TaskFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskInput) => tasksApi.create(payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: tasksKey(accountId, filters) });
      }
    },
  });
}

export function useUpdateTask(accountId?: string, filters?: TaskFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskInput }) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para atualizar tarefas");
      }
      return tasksApi.update(accountId, taskId, payload);
    },
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: tasksKey(accountId, filters) });
      }
    },
  });
}

export function useDeleteTask(accountId?: string, filters?: TaskFilters) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para remover tarefas");
      }
      return tasksApi.remove(accountId, taskId);
    },
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: tasksKey(accountId, filters) });
      }
    },
  });
}
