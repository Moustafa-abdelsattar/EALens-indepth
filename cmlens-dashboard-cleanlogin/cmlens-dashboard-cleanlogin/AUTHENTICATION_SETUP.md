# PostgreSQL Authentication Setup Guide

This guide will walk you through setting up PostgreSQL-based authentication for your cmlens-dashboard application.

## Overview

The authentication system includes:
- User registration with email whitelist
- Secure password hashing with bcrypt
- JWT-based session management
- Login/logout functionality
- Protected API routes

## Prerequisites

- Railway PostgreSQL database provisioned
- Database URL added to your environment variables

## Step 1: Database Setup in Railway

### 1.1 Access your Railway PostgreSQL Database

1. Go to your Railway project dashboard
2. Click on your PostgreSQL service
3. Click on the "Data" tab or "Connect" to get connection details

### 1.2 Run the Migration SQL

You need to execute the migration SQL to create the required tables:

**Option A: Using Railway Dashboard**
1. In Railway, go to your PostgreSQL service
2. Click on "Data" tab
3. Click on "Query" or open the SQL editor
4. Copy and paste the contents of `migrations/001_auth_setup.sql`
5. Execute the SQL

**Option B: Using psql Command Line**
```bash
# Connect to your Railway database
psql "YOUR_DATABASE_URL"

# Run the migration
\i migrations/001_auth_setup.sql
```

**Option C: Using a Database Client (DBeaver, pgAdmin, etc.)**
1. Connect to your Railway PostgreSQL database using the connection details
2. Open a new SQL query window
3. Copy and paste the contents of `migrations/001_auth_setup.sql`
4. Execute the query

### 1.3 Add Approved Emails

After running the migration, you need to add the approved email addresses that are allowed to sign up:

1. Open the file `seeds/approved_emails.sql`
2. Replace the example emails with your actual approved email addresses:
   ```sql
   INSERT INTO approved_emails (email) VALUES
       ('john@company.com'),
       ('jane@company.com'),
       ('admin@company.com')
   ON CONFLICT (email) DO NOTHING;
   ```
3. Execute this SQL in your Railway PostgreSQL database using one of the methods above

**Important**: Only users whose emails are in the `approved_emails` table will be able to create accounts!

## Step 2: Environment Variables

### 2.1 Update Local .env file

Create or update your `.env` file in the project root:

```env
# PostgreSQL Database (from Railway)
DATABASE_URL=postgresql://postgres:password@host:port/database

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Node Environment
NODE_ENV=development
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5000
```

### 2.2 Update Railway Environment Variables

1. Go to your Railway project
2. Click on your backend service (Node.js)
3. Go to "Variables" tab
4. Add these environment variables:
   - `JWT_SECRET` - A strong random string (use a password generator to create a 32+ character random string)
   - `DATABASE_URL` - Should already be set automatically by Railway
   - `NODE_ENV` - Set to `production`

**Generating a secure JWT_SECRET:**
You can generate a secure random string using:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online password generator with 32+ characters
```

## Step 3: Update Frontend Configuration

Update the Railway backend URL in the AuthContext:

1. Open `src/contexts/AuthContext.tsx`
2. Find line 5 and update the production URL:
   ```typescript
   const API_BASE_URL = import.meta.env.PROD
     ? 'https://your-backend-url.railway.app'  // Replace with your actual Railway backend URL
     : 'http://localhost:3001';
   ```
3. Replace `'https://your-backend-url.railway.app'` with your actual Railway backend URL

## Step 4: Deploy to Railway

1. Push your changes to your git repository:
   ```bash
   git add .
   git commit -m "Add PostgreSQL authentication"
   git push
   ```

2. Railway will automatically redeploy your application

## Step 5: Testing the Authentication

### 5.1 Test Locally

1. Start your local PostgreSQL (or use Railway database)
2. Run the backend server:
   ```bash
   npm run server
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```
4. Try signing up with an approved email address

### 5.2 Test Signup Flow

1. Navigate to the signup page
2. Enter an email that's in your `approved_emails` table
3. Enter a password (minimum 8 characters)
4. Submit the form
5. You should be logged in automatically

### 5.3 Test Login Flow

1. Navigate to the login page
2. Enter your email and password
3. You should be logged in and redirected to the dashboard

## Database Management

### View All Approved Emails
```sql
SELECT * FROM approved_emails ORDER BY added_at DESC;
```

### Add a New Approved Email
```sql
INSERT INTO approved_emails (email) VALUES ('newemail@example.com') ON CONFLICT (email) DO NOTHING;
```

### Remove an Approved Email
```sql
DELETE FROM approved_emails WHERE email = 'email@example.com';
```

### View All Users
```sql
SELECT id, email, first_name, last_name, is_active, created_at FROM users ORDER BY created_at DESC;
```

### Deactivate a User
```sql
UPDATE users SET is_active = false WHERE email = 'user@example.com';
```

### Reactivate a User
```sql
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

## Security Notes

1. **JWT_SECRET**: Never commit your JWT_SECRET to git. Always use environment variables.
2. **Passwords**: Passwords are hashed using bcrypt before storage. Never store plain text passwords.
3. **HTTPS**: Always use HTTPS in production to protect credentials in transit.
4. **Token Storage**: JWT tokens are stored in localStorage. Consider using httpOnly cookies for enhanced security in future updates.

## Troubleshooting

### "Email not approved for signup"
- Make sure the email is in the `approved_emails` table
- Check that the email is lowercase (the system converts to lowercase automatically)

### "User with this email already exists"
- The email is already registered
- Use the login page instead

### "Invalid or expired token"
- The JWT token has expired (default: 7 days)
- Log out and log in again

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Check that your Railway PostgreSQL service is running
- Ensure your IP is not blocked by Railway

### Cannot connect to backend
- Verify the backend is running
- Check the API_BASE_URL in AuthContext.tsx
- Check CORS settings in server/index.ts

## File Locations

- **Schema**: `shared/schema.ts` - Database schema with Drizzle ORM
- **Auth Routes**: `server/routes.ts` - Authentication endpoints
- **Auth Context**: `src/contexts/AuthContext.tsx` - Frontend authentication logic
- **Migration**: `migrations/001_auth_setup.sql` - Database setup SQL
- **Seed Data**: `seeds/approved_emails.sql` - Approved emails template

## Next Steps

1. Consider implementing password reset functionality
2. Add email verification for new signups
3. Implement role-based access control (RBAC)
4. Add session management and token refresh
5. Implement rate limiting on auth endpoints
6. Add two-factor authentication (2FA)
