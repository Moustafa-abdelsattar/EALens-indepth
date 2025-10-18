-- Example SQL to add approved emails with different roles
-- Run this SQL in your Railway PostgreSQL database after running the migration

-- Add approved emails with different roles and teams

-- Super Admin (Developer) - Full access to everything
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('admin@yourcompany.com', 3, NULL)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- Uploaders - Can upload files and see Upload & Targets pages
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('uploader1@yourcompany.com', 2, NULL),
    ('uploader2@yourcompany.com', 2, NULL)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- Team Viewers - Can only view their specific team's data
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('viewer1@yourcompany.com', 1, 'Team Alpha'),
    ('viewer2@yourcompany.com', 1, 'Team Beta'),
    ('viewer3@yourcompany.com', 1, 'Team Gamma')
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- To check what was added:
SELECT email, 
       CASE role 
           WHEN 0 THEN 'No Access'
           WHEN 1 THEN 'Team Viewer'
           WHEN 2 THEN 'Uploader'
           WHEN 3 THEN 'Developer'
           ELSE 'Unknown'
       END as role_name,
       team_name,
       added_at
FROM approved_emails
ORDER BY role DESC, email;