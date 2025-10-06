export interface Area {
  id: string;
  account_id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAreaInput {
  key: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateAreaInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}
