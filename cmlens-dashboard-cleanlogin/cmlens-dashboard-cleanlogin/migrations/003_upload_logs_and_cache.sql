-- Migration: Upload logs and agent data cache tables
-- This allows tracking uploads and caching processed Excel data

-- Create upload_logs table to track all file uploads
CREATE TABLE IF NOT EXISTS upload_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  user_email VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size INTEGER,
  rows_processed INTEGER,
  status VARCHAR NOT NULL, -- 'success' or 'error'
  error_message TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_user_id ON upload_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_uploaded_at ON upload_logs(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status ON upload_logs(status);

-- Create agent_data_cache table to store processed Excel data
CREATE TABLE IF NOT EXISTS agent_data_cache (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR NOT NULL,
  agent_id VARCHAR,
  team_name VARCHAR,
  status VARCHAR,
  average_score DECIMAL,
  total_calls INTEGER,
  answered_calls INTEGER,
  missed_calls INTEGER,
  call_duration_avg DECIMAL,
  -- Store full JSON data for flexibility
  data JSONB NOT NULL,
  uploaded_by VARCHAR REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_data_team ON agent_data_cache(team_name);
CREATE INDEX IF NOT EXISTS idx_agent_data_uploaded_at ON agent_data_cache(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_agent_data_agent_name ON agent_data_cache(agent_name);

-- View to show upload logs with user details
CREATE OR REPLACE VIEW upload_logs_with_users AS
SELECT
  ul.id,
  ul.user_email,
  u.first_name,
  u.last_name,
  ul.file_name,
  ul.file_size,
  ul.rows_processed,
  ul.status,
  ul.error_message,
  ul.uploaded_at
FROM upload_logs ul
LEFT JOIN users u ON ul.user_id = u.id
ORDER BY ul.uploaded_at DESC;
