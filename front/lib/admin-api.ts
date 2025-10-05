import { apiFetch } from "./api-client";
import type {
  Account,
  CreateAccountInput,
  CreatePlanInput,
  Plan,
  Project,
  UpdateAccountInput,
  UpdatePlanInput,
  User,
} from "./admin-types";

// ===== Plans =====

export async function getPlans() {
  return apiFetch<Plan[]>("/api/admin/plans");
}

export async function createPlan(payload: CreatePlanInput) {
  return apiFetch<Plan>("/api/admin/plans", {
    method: "POST",
    body: payload,
  });
}

export async function updatePlan(planId: string, payload: UpdatePlanInput) {
  return apiFetch<Plan>(`/api/admin/plans/${planId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deletePlan(planId: string) {
  return apiFetch<{ detail: string }>(`/api/admin/plans/${planId}`, {
    method: "DELETE",
  });
}

// ===== Accounts =====

export async function getAccounts() {
  return apiFetch<Account[]>("/api/admin/accounts");
}

export async function getAccount(accountId: string) {
  return apiFetch<Account>(`/api/admin/accounts/${accountId}`);
}

export async function createAccount(payload: CreateAccountInput) {
  return apiFetch<Account>("/api/admin/accounts", {
    method: "POST",
    body: payload,
  });
}

export async function updateAccount(accountId: string, payload: UpdateAccountInput) {
  return apiFetch<Account>(`/api/admin/accounts/${accountId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteAccount(accountId: string) {
  return apiFetch<{ detail: string }>(`/api/admin/accounts/${accountId}`, {
    method: "DELETE",
  });
}

export async function getProjects(accountId: string) {
  return apiFetch<Project[]>(`/api/admin/accounts/${accountId}/projects`);
}

export async function getUsers(accountId: string) {
  return apiFetch<User[]>(`/api/admin/accounts/${accountId}/users`);
}
