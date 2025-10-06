import { apiFetch } from "@/lib/api-client";
import type { CreateTaskTypeInput, TaskType, UpdateTaskTypeInput } from "@/lib/task-types";

const buildQuery = (accountId: string) => new URLSearchParams({ account_id: accountId });

export const taskTypesApi = {
  list: (accountId: string) => {
    const params = buildQuery(accountId);
    return apiFetch<TaskType[]>(`/api/task-types?${params.toString()}`);
  },
  create: (payload: CreateTaskTypeInput) => {
    const params = buildQuery(payload.account_id);
    const body = { ...payload };
    delete (body as Partial<CreateTaskTypeInput>).account_id;
    return apiFetch<TaskType>(`/api/task-types?${params.toString()}`, {
      method: "POST",
      body,
    });
  },
  update: (accountId: string, taskTypeId: string, payload: UpdateTaskTypeInput) => {
    const params = buildQuery(accountId);
    return apiFetch<TaskType>(`/api/task-types/${taskTypeId}?${params.toString()}`, {
      method: "PUT",
      body: payload,
    });
  },
  delete: (accountId: string, taskTypeId: string) => {
    const params = buildQuery(accountId);
    return apiFetch<void>(`/api/task-types/${taskTypeId}?${params.toString()}`, {
      method: "DELETE",
    });
  },
};
