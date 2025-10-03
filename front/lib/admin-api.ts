import {
  AssignSubscriptionInput,
  BrandingInput,
  Branding,
  CreateOrganizationInput,
  CreatePlanInput,
  Organization,
  OrganizationSummary,
  UpdateOrganizationInput,
  Plan,
  QuotaInput,
  Tenant,
  UpdatePlanInput,
  QuotaUsage,
} from "@/lib/admin-types";
import { apiFetch } from "@/lib/api-client";

export const adminApi = {
  getOrganizations: () => apiFetch<Organization[]>("/api/admin/organizations"),
  getOrganizationSummary: (organizationId: string) =>
    apiFetch<OrganizationSummary>(`/api/admin/organizations/${organizationId}/summary`),
  getTenants: (organizationId: string) =>
    apiFetch<Tenant[]>(`/api/admin/organizations/${organizationId}/tenants`),
  getPlans: () => apiFetch<Plan[]>("/api/admin/plans"),
  createOrganization: (payload: CreateOrganizationInput) =>
    apiFetch<Organization>("/api/admin/organizations", { method: "POST", body: payload }),
  updateOrganization: (organizationId: string, payload: UpdateOrganizationInput) =>
    apiFetch<Organization>(`/api/admin/organizations/${organizationId}`, {
      method: "PUT",
      body: payload,
    }),
  createPlan: (payload: CreatePlanInput) => apiFetch<Plan>("/api/admin/plans", { method: "POST", body: payload }),
  updatePlan: (planId: string, payload: UpdatePlanInput) =>
    apiFetch<Plan>(`/api/admin/plans/${planId}`, { method: "PUT", body: payload }),
  deletePlan: (planId: string) =>
    apiFetch<{ detail: string }>(`/api/admin/plans/${planId}`, { method: "DELETE" }),
  assignSubscription: (organizationId: string, payload: AssignSubscriptionInput) =>
    apiFetch(`/api/admin/organizations/${organizationId}/subscription`, {
      method: "POST",
      body: payload,
    }),
  updateBranding: (organizationId: string, payload: BrandingInput) =>
    apiFetch<Branding>(`/api/admin/organizations/${organizationId}/branding`, {
      method: "PUT",
      body: payload,
    }),
  upsertQuota: (tenantId: string, payload: QuotaInput) =>
    apiFetch<QuotaUsage>(`/api/admin/tenants/${tenantId}/quotas`, {
      method: "POST",
      body: payload,
    }),
};
