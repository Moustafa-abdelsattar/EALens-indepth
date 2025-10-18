// User roles and permissions types
export interface UserData {
  id: string;
  email: string;
  displayName?: string;
  role: number;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  NO_ACCESS = 0,      // No access - "Ask for permission first then come again!"
  TEAM_VIEWER = 1,    // Can view dashboard only for his team
  UPLOADER = 2,       // Can upload files and view dashboard after uploading
  DEVELOPER = 3       // Full access (you - the developer)
}

export interface RolePermissions {
  canViewDashboard: boolean;
  canUploadFiles: boolean;
  canViewAllTeams: boolean;
  canAccessEverything: boolean;
  teamRestricted: boolean;
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.NO_ACCESS]: {
    canViewDashboard: false,
    canUploadFiles: false,
    canViewAllTeams: false,
    canAccessEverything: false,
    teamRestricted: false,
  },
  [UserRole.TEAM_VIEWER]: {
    canViewDashboard: true,
    canUploadFiles: false,
    canViewAllTeams: false,
    canAccessEverything: false,
    teamRestricted: true,
  },
  [UserRole.UPLOADER]: {
    canViewDashboard: true,
    canUploadFiles: true,
    canViewAllTeams: true,
    canAccessEverything: false,
    teamRestricted: false,
  },
  [UserRole.DEVELOPER]: {
    canViewDashboard: true,
    canUploadFiles: true,
    canViewAllTeams: true,
    canAccessEverything: true,
    teamRestricted: false,
  },
};

export function getRolePermissions(role: number): RolePermissions {
  return ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS[UserRole.NO_ACCESS];
}

export function getRoleName(role: number): string {
  switch (role) {
    case UserRole.NO_ACCESS:
      return 'No Access';
    case UserRole.TEAM_VIEWER:
      return 'Team Viewer';
    case UserRole.UPLOADER:
      return 'Uploader';
    case UserRole.DEVELOPER:
      return 'Developer';
    default:
      return 'Unknown';
  }
}