-- Seed file: Approved emails for user registration
-- Add the emails of users who are allowed to sign up for your application
--
-- INSTRUCTIONS:
-- 1. Replace the example emails below with the actual emails you want to approve
-- 2. Run this SQL file in your Railway PostgreSQL database after running the migration
-- 3. Users with these emails will be able to sign up for accounts

-- Clear existing approved emails (optional - comment out if you want to keep existing ones)
-- TRUNCATE TABLE approved_emails;

-- Insert approved emails
-- Replace these with your actual approved email addresses
INSERT INTO approved_emails (email) VALUES
    ('abdellatif01@51talk.com'),
    ('ayman@51talk.com'),
    ('abdelrahman@51talk.com'),
    ('51ahmed.diab@gmail.com'),
    ('islammohamed@51talk.com'),
    ('abdullahessam@51talk.com'),
    ('sherifa@51talk.com'),
    ('moustafa.mohamed159357@gmail.com'),
    ('yokareda10@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Example: If you want to add more emails later, just run:
-- INSERT INTO approved_emails (email) VALUES ('newemail@example.com') ON CONFLICT (email) DO NOTHING;

-- To view all approved emails:
-- SELECT * FROM approved_emails ORDER BY added_at DESC;

-- To remove an email from the approved list:
-- DELETE FROM approved_emails WHERE email = 'email@example.com';
