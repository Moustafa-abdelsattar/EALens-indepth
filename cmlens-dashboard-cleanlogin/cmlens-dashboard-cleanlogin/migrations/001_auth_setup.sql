-- Migration: Setup authentication tables with role-based access control
-- This file contains the SQL needed to set up authentication in your PostgreSQL database

-- Create or update the users table with authentication fields
-- If the table already exists, this will add the missing columns
DO $$
BEGIN
    -- Create users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role INTEGER NOT NULL DEFAULT 0, -- 0=NoAccess, 1=TeamViewer, 2=Uploader, 3=Developer
        team_name VARCHAR, -- For Team Viewers - which team they can view
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Add columns if they don't exist (for existing tables)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='team_name') THEN
        ALTER TABLE users ADD COLUMN team_name VARCHAR;
    END IF;

    -- Make email NOT NULL and UNIQUE if not already
    ALTER TABLE users ALTER COLUMN email SET NOT NULL;

END $$;

-- Create approved_emails table for whitelist with pre-assigned roles
CREATE TABLE IF NOT EXISTS approved_emails (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    role INTEGER NOT NULL DEFAULT 1, -- Default role: 1 = Team Viewer
    team_name VARCHAR, -- Pre-assigned team for Team Viewers
    added_at TIMESTAMP DEFAULT NOW()
);

-- Create sessions table if it doesn't exist (for session management)
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on session expiration for cleanup
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Create index on users email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on approved_emails for faster lookups
CREATE INDEX IF NOT EXISTS idx_approved_emails_email ON approved_emails(email);
