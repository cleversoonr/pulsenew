export type MeetingParticipant = {
  user_id?: string | null;
  display_name: string;
  email?: string | null;
  role?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
};

export type MeetingType = {
  id: string;
  account_id: string;
  key: string;
  name: string;
  description?: string | null;
  prompt?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateMeetingTypeInput = {
  account_id: string;
  name: string;
  key?: string | null;
  description?: string | null;
  prompt?: string | null;
  is_active?: boolean;
};

export type UpdateMeetingTypeInput = {
  name?: string;
  key?: string | null;
  description?: string | null;
  prompt?: string | null;
  is_active?: boolean;
};

export type Meeting = {
  id: string;
  account_id: string;
  meeting_type: MeetingType;
  project_id?: string | null;
  title: string;
  occurred_at: string;
  duration_minutes?: number | null;
  transcript_language?: string | null;
  sentiment_score?: number | null;
  source: string;
  status: string;
  metadata: Record<string, unknown>;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  participants: MeetingParticipant[];
  chunk_count: number;
};

export type CreateMeetingInput = {
  account_id: string;
  meeting_type_id: string;
  project_id?: string | null;
  title: string;
  occurred_at: string; // ISO
  duration_minutes?: number | null;
  transcript_language?: string | null;
  sentiment_score?: number | null;
  source?: string;
  status?: string;
  notes?: string | null;
  participants?: Array<Pick<MeetingParticipant, "display_name" | "email" | "role">>;
  metadata?: Record<string, unknown>;
};

export type MeetingQueryFilters = {
  meeting_type_id?: string;
  project_id?: string;
};

export type UpdateMeetingInput = {
  account_id: string;
  meeting_type_id?: string;
  project_id?: string | null;
  title?: string;
  occurred_at?: string;
  duration_minutes?: number | null;
  transcript_language?: string | null;
  sentiment_score?: number | null;
  source?: string;
  status?: string;
  notes?: string | null;
  participants?: Array<Pick<MeetingParticipant, "display_name" | "email" | "role">> | null;
  metadata?: Record<string, unknown> | null;
};
