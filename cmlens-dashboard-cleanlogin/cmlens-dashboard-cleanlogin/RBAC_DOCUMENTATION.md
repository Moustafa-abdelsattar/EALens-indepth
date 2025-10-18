# Role-Based Access Control (RBAC) Implementation

## Overview
The CMLens Dashboard now implements a comprehensive role-based access control system with four distinct user roles, each with specific permissions and access levels.

## User Roles

### 1. No Access (Role: 0)
- **Description**: Default role for users who haven't been granted permissions
- **Access**: Cannot access any part of the dashboard
- **Message**: "Your account needs approval. Please contact an administrator."

### 2. Team Viewer (Role: 1)
- **Description**: Can view dashboard data only for their assigned team
- **Access**: 
  - Agents Performance (filtered by their team)
  - Target Analytics (filtered by their team)
- **Restrictions**: 
  - Cannot upload files
  - Cannot see other teams' data
  - Cannot access developer-only features

### 3. Uploader (Role: 2)
- **Description**: Can upload files and view most dashboard features
- **Access**:
  - Upload & Targets (full access)
  - Team Analytics (full access)
  - Agents Performance (all teams)
  - Target Analytics (all teams)
- **Restrictions**:
  - Cannot access developer-only features (Meetings, Calls)

### 4. Developer/Super Admin (Role: 3)
- **Description**: Full access to all features and functionality
- **Access**: Everything in the dashboard
- **Special Features**:
  - Weekly Meetings
  - Calls
  - All analytics and performance data
  - All teams and data

## Implementation Details

### Backend (server/routes.ts)
- JWT tokens include role and team information
- User signup inherits role from approved_emails table
- All user endpoints return role and team data

### Frontend (src/)
- **AuthContext**: Stores user role and team information
- **Header**: Displays user role and team name
- **AppSidebar**: Shows navigation items based on user role
- **ProtectedRoute**: Enforces role-based access to pages
- **App.tsx**: Routes protected with specific role requirements

### Database Schema
```sql
-- Users table
users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  role INTEGER DEFAULT 0, -- 0=NoAccess, 1=TeamViewer, 2=Uploader, 3=Developer
  team_name VARCHAR,      -- For Team Viewers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Approved emails with pre-assigned roles
approved_emails (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  role INTEGER DEFAULT 1,     -- Pre-assigned role
  team_name VARCHAR,          -- Pre-assigned team for Team Viewers
  added_at TIMESTAMP DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run Database Migration
Execute `migrations/001_auth_setup.sql` in your Railway PostgreSQL database.

### 2. Add Approved Emails
Use `seeds/example_approved_emails.sql` as a template to add approved users with their roles and teams.

### 3. Set Environment Variables
Ensure these are set in Railway:
- `JWT_SECRET`: Generated secure string
- `DATABASE_URL`: Auto-set by Railway

### 4. Update Frontend URL
In `src/contexts/AuthContext.tsx`, update the production API URL to your Railway deployment URL.

## Navigation Access by Role

| Page | Team Viewer | Uploader | Developer |
|------|-------------|----------|-----------|
| Upload & Targets | ❌ | ✅ | ✅ |
| Agents Performance | ✅ (team only) | ✅ (all teams) | ✅ (all teams) |
| Team Analytics | ❌ | ✅ | ✅ |
| Target Analytics | ✅ (team only) | ✅ (all teams) | ✅ (all teams) |
| Weekly Meetings | ❌ | ❌ | ✅ |
| Calls | ❌ | ❌ | ✅ |

## User Experience

### Header Display
Users see their role and team (if applicable) displayed in the header:
```
John Doe
Team Viewer - Team Alpha
```

### Navigation Sidebar
Only shows navigation items the user has permission to access.

### Permission Denied
Users trying to access unauthorized pages see a clear message explaining why access is denied.

## Team-Based Data Filtering

For Team Viewers, the system will need to implement data filtering based on their assigned team. This should be implemented in:
1. Backend API endpoints to filter data by team
2. Frontend components to request team-specific data
3. Database queries to include team-based WHERE clauses

## Security Features

1. **JWT-based Authentication**: Secure token-based auth with role information
2. **Route Protection**: Every route checks user permissions
3. **Component-Level Security**: Navigation and UI elements respect user roles
4. **Database-Level Control**: User roles stored securely in database
5. **No Client-Side Role Manipulation**: All role validation on backend

## Future Enhancements

1. **Team Management**: Admin interface to manage teams and assignments
2. **Role Management**: UI for admins to change user roles
3. **Audit Logging**: Track user actions and permission changes
4. **Dynamic Permissions**: More granular permission system
5. **Bulk User Management**: Import/export user lists with roles