-- Migration: Add area table and area_id to user_app
-- Created: 2025-01-06
-- Description: Creates area table for user departments/teams and adds area_id foreign key to user_app

-- Create area table
CREATE TABLE IF NOT EXISTS area (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  key             text NOT NULL,
  name            text NOT NULL,
  description     text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, key)
);

CREATE INDEX IF NOT EXISTS idx_area_account ON area(account_id);
CREATE INDEX IF NOT EXISTS idx_area_active ON area(is_active);

-- Add area_id column to user_app
ALTER TABLE user_app
ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES area(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_app_area ON user_app(area_id);

-- Add comment for documentation
COMMENT ON TABLE area IS 'Departments, teams, or organizational units within an account';
COMMENT ON COLUMN user_app.area_id IS 'Reference to the area/department this user belongs to';
