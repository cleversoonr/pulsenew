export type Plan = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_period: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  locale: string;
  timezone: string;
  max_users: number | null;
  max_projects: number | null;
  max_storage_mb: number | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
};

export type Subscription = {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  payment_method: Record<string, unknown>;
  external_reference: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan;
};

export type Branding = {
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  custom_domain: string | null;
  login_message: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotaUsage = {
  id: string;
  tenant_id: string;
  metric: string;
  period_start: string;
  period_end: string;
  limit_value: number | null;
  used_value: number;
  last_reset_at: string;
  updated_at: string;
  tenant?: Tenant | null;
};

export type Invoice = {
  id: string;
  subscription_id: string;
  organization_id: string;
  issued_at: string;
  due_at: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  line_items: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  external_reference: string | null;
};

export type OrganizationSummary = {
  organization_id: string;
  plan: Plan | null;
  subscription: Subscription | null;
  branding: Branding | null;
  quotas: QuotaUsage[];
  invoices: Invoice[];
  tenants: Tenant[];
};

export type CreatePlanInput = {
  key: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  billing_period: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  is_active: boolean;
};

export type UpdatePlanInput = Partial<CreatePlanInput>;

export type AssignSubscriptionInput = {
  plan_id: string;
  status?: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string | null;
  payment_method?: Record<string, unknown>;
  external_reference?: string | null;
};

export type CreateOrganizationInput = {
  name: string;
  slug?: string | null;
  plan?: string;
  locale?: string;
  timezone?: string;
  max_users?: number | null;
  max_projects?: number | null;
  max_storage_mb?: number | null;
  settings?: Record<string, unknown>;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type BrandingInput = {
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  custom_domain?: string | null;
  login_message?: string | null;
};

export type QuotaInput = {
  metric: string;
  period_start: string;
  period_end: string;
  limit_value?: number | null;
  used_value: number;
};
