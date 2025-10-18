# Role-Based Access Control Setup Guide

## Role Structure

Your system now has 4 role levels:

| Role ID | Role Name | Permissions | Team Assignment |
|---------|-----------|-------------|-----------------|
| 0 | No Access | Blocked from dashboard | N/A |
| 1 | Team Viewer | View dashboard for assigned team only | Required |
| 2 | Uploader | Upload files + view all teams | Optional |
| 3 | Developer | Full access (super user) | N/A |

## Step 1: Run the Migration

Execute this SQL in your Railway PostgreSQL database:

```bash
# Connect to Railway PostgreSQL and run:
```

Copy the contents of: `migrations/002_add_roles.sql`

This adds `role` and `team_name` columns to both `users` and `approved_emails` tables.

## Step 2: Assign Roles to Approved Emails

Edit the file: `seeds/approved_emails_with_roles.sql`

### Current Assignments (UPDATE THESE):

**Developers (role = 3)** - Full Access
- moustafa.mohamed159357@gmail.com
- yokareda10@gmail.com

**Uploaders (role = 2)** - Can upload files and view all teams
- abdellatif01@51talk.com
- ayman@51talk.com

**Team Viewers (role = 1)** - Can only view their assigned team
- abdelrahman@51talk.com → TeamA
- 51ahmed.diab@gmail.com → TeamB
- islammohamed@51talk.com → TeamA
- abdullahessam@51talk.com → TeamC
- sherifa@51talk.com → TeamB

### How to Update:

1. Open `seeds/approved_emails_with_roles.sql`
2. Move emails between the role sections as needed
3. For Team Viewers, replace 'TeamA', 'TeamB', etc. with actual team names
4. Run the SQL in Railway PostgreSQL

## Step 3: Test the System

### When Users Sign Up:
1. User enters their email and password
2. System checks if email is in `approved_emails` table
3. If approved, user account is created with the pre-assigned role and team
4. User is automatically logged in with their permissions

### Permission Matrix:

| Feature | Team Viewer | Uploader | Developer |
|---------|------------|----------|-----------|
| View Dashboard | ✅ (own team only) | ✅ (all teams) | ✅ (all teams) |
| Upload Files | ❌ | ✅ | ✅ |
| Admin Settings | ❌ | ❌ | ✅ |
| View All Teams | ❌ | ✅ | ✅ |

## Step 4: Managing Roles After Signup

### View all users and their roles:
```sql
SELECT
    email,
    CASE role
        WHEN 0 THEN 'No Access'
        WHEN 1 THEN 'Team Viewer'
        WHEN 2 THEN 'Uploader'
        WHEN 3 THEN 'Developer'
    END as role_name,
    team_name,
    is_active,
    created_at
FROM users
ORDER BY role DESC, team_name;
```

### Change a user's role:
```sql
-- Promote user to Uploader
UPDATE users SET role = 2 WHERE email = 'user@example.com';

-- Assign user to a different team
UPDATE users SET team_name = 'TeamX' WHERE email = 'user@example.com';

-- Demote user (revoke access)
UPDATE users SET role = 0 WHERE email = 'user@example.com';

-- Deactivate user account
UPDATE users SET is_active = false WHERE email = 'user@example.com';
```

### Add new approved email with role:
```sql
INSERT INTO approved_emails (email, role, team_name) VALUES
    ('newemail@51talk.com', 1, 'TeamA')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    team_name = EXCLUDED.team_name;
```

## File Locations

- **Schema**: `shared/schema.ts` - TypeScript types and role permissions
- **Migration**: `migrations/002_add_roles.sql` - Database structure
- **Seed Template**: `seeds/approved_emails_with_roles.sql` - Role assignments (UPDATE THIS)
- **Auth Routes**: `server/routes.ts` - Inherits role on signup
- **Protected Route**: `src/components/auth/ProtectedRoute.tsx` - Enforces permissions

## Next Steps

1. ✅ Update `seeds/approved_emails_with_roles.sql` with correct roles and teams
2. ✅ Run `migrations/002_add_roles.sql` in Railway PostgreSQL
3. ✅ Run updated `seeds/approved_emails_with_roles.sql` in Railway PostgreSQL
4. ✅ Have users sign up - they'll get their assigned role automatically
5. ✅ Test each role to ensure permissions work correctly
