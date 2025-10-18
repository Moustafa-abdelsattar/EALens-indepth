-- Seed file: Approved emails with roles and team assignments
--
-- ROLE VALUES:
-- 0 = No Access (blocked)
-- 1 = Team Viewer (can view specific team data only)
-- 2 = Uploader (can upload files and view all teams)
-- 3 = Developer (super user - full access)
--
-- INSTRUCTIONS:
-- 1. Update this file with the correct role and team for each email
-- 2. Run this SQL in your Railway PostgreSQL database
-- 3. When users sign up, they will inherit the role and team from this table

-- Clear existing data (optional - comment out if you want to keep existing)
-- TRUNCATE TABLE approved_emails;

-- Insert approved emails with roles and teams
-- Format: (email, role, team_name)

-- DEVELOPERS (role = 3) - Full access
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('moustafa.mohamed159357@gmail.com', 3, NULL)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- UPLOADERS (role = 2) - Can upload and view all teams
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('yokareda10@gmail.com', 2, NULL)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- TEAM VIEWERS (role = 1) - Can only view their assigned team
-- Replace 'TeamA', 'TeamB' etc with actual team names from your system
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('abdellatif01@51talk.com', 2, 'EGLP3 51abdellatif01'),
    ('ayman@51talk.com', 2, NULL),
    ('abdelrahman@51talk.com', 1, 'EGLP-GCC01 51abdelrahman'),
    ('51ahmed.diab@gmail.com', 1, NULL),
    ('islammohamed@51talk.com', 1, 'EGLP1 EGSS-Lobna'),
    ('abdullahessam@51talk.com', 1, 'EGLP-GCC01 51abdelrahman'),
    ('sherifa@51talk.com', 1, 'EGLP4 51sherif')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;

-- View all approved emails with their roles
SELECT
    email,
    CASE role
        WHEN 0 THEN 'No Access'
        WHEN 1 THEN 'Team Viewer'
        WHEN 2 THEN 'Uploader'
        WHEN 3 THEN 'Developer'
    END as role_name,
    team_name,
    added_at
FROM approved_emails
ORDER BY role DESC, team_name, email;