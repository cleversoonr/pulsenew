export type TaskType = {
  id: string;
  account_id: string;
  key: string;
  name: string;
  description?: string | null;
  workflow: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateTaskTypeInput = {
  account_id: string;
  key: string;
  name: string;
  description?: string | null;
  workflow?: Record<string, unknown>;
};

export type UpdateTaskTypeInput = {
  key?: string;
  name?: string;
  description?: string | null;
  workflow?: Record<string, unknown>;
};
