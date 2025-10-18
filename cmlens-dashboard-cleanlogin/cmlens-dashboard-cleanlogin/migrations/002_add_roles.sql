-- Migration: Add role-based access control
-- Adds role and team_name fields to users and approved_emails tables

-- Add role and team_name columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_name VARCHAR;

-- Add role and team_name columns to approved_emails table
ALTER TABLE approved_emails
  ADD COLUMN IF NOT EXISTS role INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS team_name VARCHAR;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team_name ON users(team_name);

-- Comments for documentation
COMMENT ON COLUMN users.role IS '0=NoAccess, 1=TeamViewer, 2=Uploader, 3=Developer';
COMMENT ON COLUMN users.team_name IS 'Team name for Team Viewers (role=1)';
COMMENT ON COLUMN approved_emails.role IS 'Pre-assigned role: 0=NoAccess, 1=TeamViewer, 2=Uploader, 3=Developer';
COMMENT ON COLUMN approved_emails.team_name IS 'Pre-assigned team for Team Viewers';
