import { sql } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Role enum: 0 = No Access, 1 = Team Viewer, 2 = Uploader, 3 = Developer
export type UserRole = 0 | 1 | 2 | 3;

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with authentication and roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: integer("role").notNull().default(0), // 0=NoAccess, 1=TeamViewer, 2=Uploader, 3=Developer
  teamName: varchar("team_name"), // For Team Viewers - which team they can view
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approved emails whitelist table with pre-assigned roles
export const approvedEmails = pgTable("approved_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  role: integer("role").notNull().default(1), // Default role: 1 = Team Viewer
  teamName: varchar("team_name"), // Pre-assigned team for Team Viewers
  addedAt: timestamp("added_at").defaultNow(),
});

// Upload logs table to track file uploads
export const uploadLogs = pgTable("upload_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  userEmail: varchar("user_email").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  rowsProcessed: integer("rows_processed"),
  status: varchar("status").notNull(), // 'success' or 'error'
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Agent data cache table to store processed Excel data
export const agentDataCache = pgTable("agent_data_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentName: varchar("agent_name").notNull(),
  agentId: varchar("agent_id"),
  teamName: varchar("team_name"),
  status: varchar("status"),
  averageScore: decimal("average_score"),
  totalCalls: integer("total_calls"),
  answeredCalls: integer("answered_calls"),
  missedCalls: integer("missed_calls"),
  callDurationAvg: decimal("call_duration_avg"),
  data: jsonb("data").notNull(), // Full JSON data for flexibility
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ApprovedEmail = typeof approvedEmails.$inferSelect;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type AgentDataCache = typeof agentDataCache.$inferSelect;

// Role permissions helper
export const getRolePermissions = (role: UserRole) => {
  switch (role) {
    case 3: // Developer
      return {
        canViewDashboard: true,
        canUploadFiles: true,
        canAccessEverything: true,
        canViewAllTeams: true,
        roleName: 'Developer',
      };
    case 2: // Uploader
      return {
        canViewDashboard: true,
        canUploadFiles: true,
        canAccessEverything: false,
        canViewAllTeams: true,
        roleName: 'Uploader',
      };
    case 1: // Team Viewer
      return {
        canViewDashboard: true,
        canUploadFiles: false,
        canAccessEverything: false,
        canViewAllTeams: false,
        roleName: 'Team Viewer',
      };
    case 0: // No Access
    default:
      return {
        canViewDashboard: false,
        canUploadFiles: false,
        canAccessEverything: false,
        canViewAllTeams: false,
        roleName: 'No Access',
      };
  }
};