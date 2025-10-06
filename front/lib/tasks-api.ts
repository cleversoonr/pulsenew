import { apiFetch } from "@/lib/api-client";
import type { CreateTaskInput, Task, TaskFilters, UpdateTaskInput } from "@/lib/tasks";

const buildQuery = (accountId: string, filters?: TaskFilters) => {
  const params = new URLSearchParams({ account_id: accountId });
  if (filters?.project_id) params.append("project_id", filters.project_id);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.priority) params.append("priority", filters.priority);
  return params;
};

export const tasksApi = {
  list: (accountId: string, filters?: TaskFilters) => {
    const params = buildQuery(accountId, filters);
    return apiFetch<Task[]>(`/api/tasks?${params.toString()}`);
  },
  detail: (accountId: string, taskId: string) => {
    const params = buildQuery(accountId);
    return apiFetch<Task>(`/api/tasks/${taskId}?${params.toString()}`);
  },
  create: (payload: CreateTaskInput) => apiFetch<Task>(`/api/tasks`, { method: "POST", body: payload }),
  update: (accountId: string, taskId: string, payload: UpdateTaskInput) => {
    const params = buildQuery(accountId);
    return apiFetch<Task>(`/api/tasks/${taskId}?${params.toString()}`, {
      method: "PUT",
      body: payload,
    });
  },
  remove: (accountId: string, taskId: string) => {
    const params = buildQuery(accountId);
    return apiFetch<void>(`/api/tasks/${taskId}?${params.toString()}`, {
      method: "DELETE",
    });
  },
};
