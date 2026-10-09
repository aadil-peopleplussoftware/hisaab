export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  timezone: string;
  locale: string;
}

export interface UpdatePreferencesRequest {
  fullName: string;
  avatarUrl?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  timezone: string;
  locale: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAtUtc: string;
  lockoutEnd: string | null;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  timestampUtc: string;
}

export interface AuditLogsResponse {
  totalCount: number;
  page: number;
  pageSize: number;
  items: AuditLogItem[];
}

export interface SystemHealth {
  status: string;
  timestampUtc: string;
  processUptime: string;
  memoryAllocatedMb: number;
  workingSetMb: number;
  framework: string;
  osDescription: string;
  processArchitecture: string;
  databaseProvider: string;
}

