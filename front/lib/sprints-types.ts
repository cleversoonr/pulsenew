export type TaskSummary = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  estimate_hours?: number | null;
  story_points?: number | null;
  due_date?: string | null;
  assignee_id?: string | null;
};

export type SprintTaskInput = {
  task_id: string;
  planned_hours?: number | null;
  planned_points?: number | null;
  status?: string;
  notes?: string | null;
  position?: number | null;
};

export type SprintCapacityInput = {
  user_id: string;
  week_start: string;
  hours: number;
};

export type SprintTask = SprintTaskInput & {
  sprint_id: string;
  account_id: string;
  task: TaskSummary;
};

export type SprintCapacity = SprintCapacityInput & {
  id: string;
  sprint_id?: string | null;
  account_id: string;
  created_at: string;
  updated_at: string;
};

export type Sprint = {
  id: string;
  account_id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  sprint_number?: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
  updated_at: string;
  tasks: SprintTask[];
  capacities: SprintCapacity[];
};

export type CreateSprintInput = {
  account_id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  sprint_number?: number | null;
  starts_at: string;
  ends_at: string;
  status?: string;
  tasks?: SprintTaskInput[];
  capacities?: SprintCapacityInput[];
};

export type UpdateSprintInput = Partial<Omit<CreateSprintInput, "account_id" | "project_id" >> & {
  tasks?: SprintTaskInput[];
  capacities?: SprintCapacityInput[];
};
