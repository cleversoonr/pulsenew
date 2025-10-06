import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "@/lib/admin-api";
import type {
  CreateAccountInput,
  CreatePlanInput,
  CreateProjectInput,
  CreateUserInput,
  UpdateAccountInput,
  UpdatePlanInput,
  UpdateProjectInput,
  UpdateUserInput,
} from "@/lib/admin-types";

// ===== Plans =====

export function usePlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => adminApi.getPlans(),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanInput) => adminApi.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: UpdatePlanInput }) =>
      adminApi.updatePlan(planId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => adminApi.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
  });
}

// ===== Accounts =====

export function useAccounts() {
  return useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: () => adminApi.getAccounts(),
  });
}

export function useAccount(accountId?: string) {
  return useQuery({
    queryKey: ["admin", "accounts", accountId],
    queryFn: () => adminApi.getAccount(accountId!),
    enabled: !!accountId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountInput) => adminApi.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, payload }: { accountId: string; payload: UpdateAccountInput }) =>
      adminApi.updateAccount(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => adminApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "accounts"] });
    },
  });
}

export function useProjects(accountId?: string) {
  return useQuery({
    queryKey: ["admin", "projects", accountId],
    queryFn: () => adminApi.getProjects(accountId!),
    enabled: !!accountId,
  });
}

export function useCreateProject(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectInput) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para cadastrar o projeto");
      }
      return adminApi.createProject(accountId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", accountId] });
    },
  });
}

export function useUpdateProject(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: UpdateProjectInput }) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para atualizar o projeto");
      }
      return adminApi.updateProject(accountId, projectId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", accountId] });
    },
  });
}

export function useDeleteProject(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para remover o projeto");
      }
      return adminApi.deleteProject(accountId, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", accountId] });
    },
  });
}

export function useUsers(accountId?: string) {
  return useQuery({
    queryKey: ["admin", "users", accountId],
    queryFn: () => adminApi.getUsers(accountId!),
    enabled: !!accountId,
  });
}

export function useCreateUser(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserInput) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para cadastrar o usuário");
      }
      return adminApi.createUser(accountId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", accountId] });
    },
  });
}

export function useUpdateUser(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserInput }) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para atualizar o usuário");
      }
      return adminApi.updateUser(accountId, userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", accountId] });
    },
  });
}

export function useDeleteUser(accountId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => {
      if (!accountId) {
        throw new Error("Selecione uma conta para remover o usuário");
      }
      return adminApi.deleteUser(accountId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", accountId] });
    },
  });
}
