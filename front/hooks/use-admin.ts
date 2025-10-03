import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import type {
  AssignSubscriptionInput,
  BrandingInput,
  CreateOrganizationInput,
  CreatePlanInput,
  Organization,
  OrganizationSummary,
  Plan,
  QuotaInput,
  Tenant,
  UpdatePlanInput,
  UpdateOrganizationInput,
} from "@/lib/admin-types";

const organizationsKey = ["admin", "organizations"] as const;
const plansKey = ["admin", "plans"] as const;
const summaryKey = (organizationId: string) => ["admin", "organizations", organizationId, "summary"] as const;
const tenantsKey = (organizationId: string) => ["admin", "organizations", organizationId, "tenants"] as const;

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: organizationsKey,
    queryFn: adminApi.getOrganizations,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrganizationInput) => adminApi.createOrganization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationsKey });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, payload }: { organizationId: string; payload: UpdateOrganizationInput }) =>
      adminApi.updateOrganization(organizationId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationsKey });
      if (variables.organizationId) {
        queryClient.invalidateQueries({ queryKey: summaryKey(variables.organizationId) });
      }
    },
  });
}

export function useOrganizationSummary(organizationId?: string) {
  return useQuery<OrganizationSummary>({
    queryKey: organizationId ? summaryKey(organizationId) : [],
    queryFn: () => adminApi.getOrganizationSummary(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useTenants(organizationId?: string) {
  return useQuery<Tenant[]>({
    queryKey: organizationId ? tenantsKey(organizationId) : [],
    queryFn: () => adminApi.getTenants(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: plansKey,
    queryFn: adminApi.getPlans,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanInput) => adminApi.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKey });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, payload }: { planId: string; payload: UpdatePlanInput }) =>
      adminApi.updatePlan(planId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKey });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => adminApi.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKey });
    },
  });
}

export function useAssignSubscription(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignSubscriptionInput) => {
      if (!organizationId) {
        return Promise.reject(new Error("Organização não selecionada"));
      }
      return adminApi.assignSubscription(organizationId, payload);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: summaryKey(organizationId) });
      }
    },
  });
}

export function useUpdateBranding(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BrandingInput) => {
      if (!organizationId) {
        return Promise.reject(new Error("Organização não selecionada"));
      }
      return adminApi.updateBranding(organizationId, payload);
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: summaryKey(organizationId) });
      }
    },
  });
}

export function useUpsertQuota(organizationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, payload }: { tenantId: string; payload: QuotaInput }) =>
      adminApi.upsertQuota(tenantId, payload),
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: summaryKey(organizationId) });
        queryClient.invalidateQueries({ queryKey: tenantsKey(organizationId) });
      }
    },
  });
}
