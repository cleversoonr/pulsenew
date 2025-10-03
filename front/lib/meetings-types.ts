export type MeetingParticipant = {
  user_id?: string | null;
  display_name: string;
  email?: string | null;
  role?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
};

export type Meeting = {
  id: string;
  organization_id: string;
  tenant_id: string;
  project_id?: string | null;
  title: string;
  meeting_type: string;
  occurred_at: string;
  duration_minutes?: number | null;
  transcript_language?: string | null;
  sentiment_score?: number | null;
  source: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  participants: MeetingParticipant[];
  chunk_count: number;
};

export type CreateMeetingInput = {
  organization_id: string;
  tenant_id: string;
  project_id?: string | null;
  title: string;
  meeting_type: string;
  occurred_at: string; // ISO
  duration_minutes?: number | null;
  transcript_language?: string | null;
  sentiment_score?: number | null;
  source?: string;
  notes?: string | null;
  participants?: Array<Pick<MeetingParticipant, "display_name" | "email" | "role">>;
  metadata?: Record<string, unknown>;
};
