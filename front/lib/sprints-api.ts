import { apiFetch } from "@/lib/api-client";
import type {
  CreateSprintInput,
  Sprint,
  TaskSummary,
  UpdateSprintInput,
} from "@/lib/sprints-types";

export const sprintsApi = {
  list: (accountId: string, projectId: string, status?: string) => {
    const params = new URLSearchParams({ account_id: accountId, project_id: projectId });
    if (status) params.set("status", status);
    return apiFetch<Sprint[]>(`/api/sprints?${params.toString()}`);
  },
  detail: (sprintId: string) => apiFetch<Sprint>(`/api/sprints/${sprintId}`),
  create: (payload: CreateSprintInput) =>
    apiFetch<Sprint>("/api/sprints", { method: "POST", body: payload }),
  update: (sprintId: string, payload: UpdateSprintInput) =>
    apiFetch<Sprint>(`/api/sprints/${sprintId}`, { method: "PUT", body: payload }),
  remove: (sprintId: string) => apiFetch<void>(`/api/sprints/${sprintId}`, { method: "DELETE" }),
  tasks: (accountId: string, projectId: string, status?: string) => {
    const params = new URLSearchParams({ account_id: accountId, project_id: projectId });
    if (status) params.set("status", status);
    return apiFetch<TaskSummary[]>(`/api/sprints/available-tasks?${params.toString()}`);
  },
};
