export interface CurrentUser {
  id: number;
  email: string;
  role: "admin" | "operator" | "viewer";
}

export interface AdminOverview {
  live_ingestion_status: Array<Record<string, unknown>>;
  last_successful_fetch_at: string | null;
  rooms_online: number;
  rooms_offline: number;
  active_alerts: number;
  sensor_faults: number;
  api_source_health: string;
  database_health: string;
  recent_admin_actions: AuditLog[];
}

export interface UserRecord {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface IpAllowlistEntry {
  id: number;
  cidr: string;
  label: string | null;
  description: string | null;
  scope: "dashboard_access" | "admin_access" | "api_access";
  is_active: boolean;
  created_by_user_id: number | null;
  created_at: string;
  last_matched_at: string | null;
}

export interface ThresholdRule {
  id: number;
  scope_type: "global" | "group" | "room" | "sensor";
  scope_id: number | null;
  scope_key: string | null;
  normal_min_c: number | null;
  normal_max_c: number | null;
  warning_min_c: number | null;
  warning_max_c: number | null;
  critical_min_c: number | null;
  critical_max_c: number | null;
  stale_after_seconds: number;
  fault_rules: Record<string, unknown> | null;
  is_active: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminAlert {
  id: number;
  room_id: number | null;
  sensor_id: number | null;
  severity: string;
  status: string;
  message: string;
  opened_at: string;
  last_seen_at: string;
}

export interface SensorFault {
  id: number;
  room_id: number | null;
  sensor_id: number | null;
  source_tag: string;
  fault_type: string;
  status: string;
  message: string;
  opened_at: string;
  last_seen_at: string;
}

export interface AdminRoom {
  id: number;
  room_number: number;
  name: string;
  group_code: string;
  sensors: Array<{ id: number; source_tag: string; label: string }>;
}

export interface SystemSetting {
  key: string;
  value: unknown;
  is_secret: boolean;
  updated_at: string;
}
