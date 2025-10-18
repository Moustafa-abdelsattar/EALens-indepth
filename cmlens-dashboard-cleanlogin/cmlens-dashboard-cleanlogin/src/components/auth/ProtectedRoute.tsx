import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRolePermissions, UserRole } from '@/types/user';
import Login from '@/components/auth/Login';
import PermissionDenied from '@/components/auth/PermissionDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresUpload?: boolean;  // For routes that require upload permissions
  requiresFullAccess?: boolean; // For developer-only routes
  allowedRoles?: UserRole[]; // Specific roles allowed for this route
}

export default function ProtectedRoute({
  children,
  requiresUpload = false,
  requiresFullAccess = false,
  allowedRoles
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  // Show loading while authentication is being checked
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

  // If not authenticated, show login
  if (!currentUser) {
    return <Login />;
  }

  // Check role-based permissions
  const userRole = currentUser.role as UserRole;
  const permissions = getRolePermissions(userRole);

  // Check if user has no access
  if (userRole === UserRole.NO_ACCESS) {
    return <PermissionDenied message="Your account needs approval. Please contact an administrator." />;
  }

  // Check specific role requirements
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <PermissionDenied message="You don't have permission to access this page." />;
  }

  // Check upload permissions
  if (requiresUpload && !permissions.canUploadFiles) {
    return <PermissionDenied message="You don't have permission to upload files." />;
  }

  // Check full access requirements
  if (requiresFullAccess && !permissions.canAccessEverything) {
    return <PermissionDenied message="This page requires developer access." />;
  }

  // User has appropriate permissions
  return <>{children}</>;
}