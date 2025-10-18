# Remaining Role-Based Access Implementation

## ✅ Already Completed:
1. Database schema with roles and teams
2. Migration and seed files
3. Role assignment in approved_emails
4. Backend returns role and team on signup/login
5. AuthContext stores user role and team

## 🚧 Still Need to Implement:

### 1. Display Role Badge in Dashboard Header

Create a component to show the user's role at the top of the page.

**File**: `src/components/RoleBadge.tsx` (NEW)
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function RoleBadge() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const getRoleName = (role: number) => {
    switch (role) {
      case 3: return 'Developer';
      case 2: return 'Uploader';
      case 1: return 'Team Viewer';
      default: return 'No Access';
    }
  };

  const getRoleColor = (role: number) => {
    switch (role) {
      case 3: return 'bg-purple-500';
      case 2: return 'bg-blue-500';
      case 1: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${getRoleColor(currentUser.role)} text-white`}>
        {getRoleName(currentUser.role)}
      </Badge>
      {currentUser.teamName && (
        <Badge variant="outline">
          Team: {currentUser.teamName}
        </Badge>
      )}
    </div>
  );
}
```

**Add to Dashboard**: Find your main layout/header component and add:
```typescript
import RoleBadge from '@/components/RoleBadge';

// In your header:
<div className="flex items-center justify-between">
  <h1>Dashboard</h1>
  <RoleBadge />
</div>
```

### 2. Update ProtectedRoute with Role-Based Restrictions

**File**: `src/components/auth/ProtectedRoute.tsx`

```typescript
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRolePermissions } from '@/../../shared/schema';
import Login from '@/components/auth/Login';
import PermissionDenied from '@/components/auth/PermissionDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresUpload?: boolean;
  requiresFullAccess?: boolean;
}

export default function ProtectedRoute({
  children,
  requiresUpload = false,
  requiresFullAccess = false
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const permissions = getRolePermissions(currentUser.role as 0 | 1 | 2 | 3);

  // Check for role 0 (No Access)
  if (currentUser.role === 0 || !permissions.canViewDashboard) {
    return <PermissionDenied />;
  }

  // Check for upload requirement
  if (requiresUpload && !permissions.canUploadFiles) {
    return <PermissionDenied />;
  }

  // Check for full access requirement
  if (requiresFullAccess && !permissions.canAccessEverything) {
    return <PermissionDenied />;
  }

  return <>{children}</>;
}
```

### 3. Filter Routes Based on Role

**File**: `src/App.tsx` or your router file

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AppRoutes() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 0;

  return (
    <Routes>
      {/* Everyone (logged in) can see dashboard */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Uploaders and Developers only */}
      {(userRole === 2 || userRole === 3) && (
        <>
          <Route path="/upload" element={<ProtectedRoute requiresUpload><Upload /></ProtectedRoute>} />
          <Route path="/targets" element={<ProtectedRoute requiresUpload><Targets /></ProtectedRoute>} />
        </>
      )}

      {/* Developers only */}
      {userRole === 3 && (
        <Route path="/admin" element={<ProtectedRoute requiresFullAccess><Admin /></ProtectedRoute>} />
      )}

      {/* Redirect based on role */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
```

### 4. Filter Team Dropdown for Team Viewers

**File**: Where you have the "All Teams" dropdown (from your screenshot)

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function TeamFilter() {
  const { currentUser } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState('all');

  // If user is Team Viewer, lock them to their team
  const isTeamViewer = currentUser?.role === 1;
  const userTeam = currentUser?.teamName;

  // Available teams (replace with your actual teams)
  const allTeams = [
    'EGLP1 EGSS-Lobna',
    'EGLP3 51abdellatif01',
    'EGLP-GCC01 51abdelrahman',
    'EGLP4 51sherif'
  ];

  // Filter teams based on role
  const availableTeams = isTeamViewer && userTeam
    ? [userTeam]  // Only show their assigned team
    : allTeams;   // Show all teams for Uploaders/Developers

  return (
    <Select
      value={isTeamViewer ? userTeam || 'all' : selectedTeam}
      onValueChange={setSelectedTeam}
      disabled={isTeamViewer}  // Disable dropdown for Team Viewers
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!isTeamViewer && <SelectItem value="all">All Teams</SelectItem>}
        {availableTeams.map(team => (
          <SelectItem key={team} value={team}>{team}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 5. Filter Dashboard Data by Team

**File**: Your dashboard data fetching logic

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [agentData, setAgentData] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch('/api/agent-data');
      const data = await response.json();

      // Filter by team for Team Viewers
      if (currentUser?.role === 1 && currentUser.teamName) {
        const filtered = data.filter(agent =>
          agent.teamName === currentUser.teamName
        );
        setAgentData(filtered);
      } else {
        // Uploaders and Developers see all
        setAgentData(data);
      }
    }

    fetchData();
  }, [currentUser]);

  return <div>{/* Render filtered data */}</div>;
}
```

### 6. Create Upload Logs Table

**File**: `migrations/003_upload_logs.sql` (NEW)

```sql
-- Create upload logs table
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

CREATE INDEX idx_upload_logs_user_id ON upload_logs(user_id);
CREATE INDEX idx_upload_logs_uploaded_at ON upload_logs(uploaded_at);
```

### 7. Add Upload Logging Endpoint

**File**: `server/routes.ts`

Add this endpoint before the proxy endpoint:

```typescript
// Log upload activity
app.post('/api/log-upload', authenticateToken, async (req: any, res: any) => {
  try {
    const { fileName, fileSize, rowsProcessed, status, errorMessage } = req.body;

    await db.insert(uploadLogs).values({
      userId: req.user.userId,
      userEmail: req.user.email,
      fileName,
      fileSize,
      rowsProcessed,
      status,
      errorMessage: errorMessage || null,
    });

    res.json({ message: 'Upload logged successfully' });
  } catch (error) {
    console.error('Error logging upload:', error);
    res.status(500).json({ message: 'Failed to log upload' });
  }
});
```

### 8. Log Uploads from Frontend

**File**: Your upload component

```typescript
async function handleUpload(file: File) {
  try {
    // Process upload...
    const response = await fetch('/api/process-agent-data', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    const result = await response.json();

    // Log the upload
    await fetch('/api/log-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        rowsProcessed: result.rowsProcessed || 0,
        status: 'success'
      })
    });

    toast.success('File processed successfully!');
  } catch (error) {
    // Log the error
    await fetch('/api/log-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        status: 'error',
        errorMessage: error.message
      })
    });

    toast.error('Upload failed');
  }
}
```

## Summary of Changes Needed:

1. ✅ Backend returns role/team (DONE)
2. ✅ AuthContext stores role/team (DONE)
3. Create RoleBadge component
4. Update ProtectedRoute with role checks
5. Filter routes by role
6. Filter team dropdown for Team Viewers
7. Filter dashboard data by team
8. Create upload_logs table
9. Add upload logging endpoint
10. Log uploads from frontend

## Quick Start:

1. Run: `migrations/003_upload_logs.sql` in Railway PostgreSQL
2. Create `RoleBadge.tsx` component
3. Update `ProtectedRoute.tsx` with role checks
4. Add team filtering to dashboard components
5. Implement upload logging

All the backend work is done - now it's mainly frontend UI updates!
