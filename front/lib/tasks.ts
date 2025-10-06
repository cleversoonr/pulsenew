import type { TaskType } from "@/lib/task-types";

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  estimate_hours?: number | null;
  actual_hours?: number | null;
  story_points?: number | null;
  due_date?: string | null;
  assignee_id?: string | null;
  task_type_id?: string | null;
  description?: string | null;
  external_ref?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  task_type?: TaskType | null;
};

export type CreateTaskInput = {
  account_id: string;
  project_id: string;
  title: string;
  status?: string;
  priority?: string;
  description?: string | null;
  task_type_id?: string | null;
  parent_id?: string | null;
  estimate_hours?: number | null;
  actual_hours?: number | null;
  story_points?: number | null;
  due_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
  external_ref?: string | null;
};

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "account_id" | "project_id" | "title" >> & {
  project_id?: string;
  title?: string;
};

export type TaskFilters = {
  project_id?: string | null;
  status?: string | null;
  priority?: string | null;
};
