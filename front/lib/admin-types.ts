export type Plan = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_period: string;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  locale: string;
  timezone: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: Plan | null;
};

export type CreatePlanInput = {
  key: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  billing_period: string;
  features: Record<string, unknown>;
  is_active: boolean;
};

export type UpdatePlanInput = Partial<Omit<CreatePlanInput, "key">>;

export type CreateAccountInput = {
  name: string;
  slug?: string | null;
  plan_id?: string | null;
  locale?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
};

export type UpdateAccountInput = Partial<CreateAccountInput>;

export type Project = {
  id: string;
  account_id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProjectInput = {
  key: string;
  name: string;
  description?: string | null;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type User = {
  id: string;
  account_id: string;
  area_id?: string | null;
  email: string;
  full_name: string;
  picture_url?: string | null;
  locale: string;
  timezone?: string | null;
  phone?: string | null;
  is_root?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type CreateUserInput = {
  email: string;
  full_name: string;
  area_id?: string | null;
  picture_url?: string | null;
  locale?: string;
  timezone?: string | null;
  phone?: string | null;
  is_root?: boolean | null;
  password?: string | null;
};

export type UpdateUserInput = Partial<CreateUserInput>;
