export type Status = "normal" | "warning" | "critical" | "fault" | "offline";
export type Quality = "good" | "missing" | "invalid" | "unavailable" | "impossible" | "stale";

export interface SensorReading {
  source_tag: string;
  label: string;
  value_c: number | null;
  quality: Quality;
  status: Status;
}

export interface RoomSnapshot {
  room_number: number;
  room_name: string;
  group_code: string;
  average_c: number | null;
  status: Status;
  sensors: SensorReading[];
  active_alerts: string[];
}

export interface GroupSnapshot {
  group_code: string;
  room_numbers: number[];
  rooms: RoomSnapshot[];
}

export interface Overview {
  total_rooms: number;
  total_sensors: number;
  average_c: number | null;
  active_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
  sensor_faults: number;
  last_log_time: string | null;
}

export interface DashboardSnapshot {
  overview: Overview;
  groups: GroupSnapshot[];
}

export interface HistoryPoint {
  logged_at: string;
  average_c: number | null;
  sensors: SensorReading[];
}

export type ConnectionState = "live" | "reconnecting" | "offline";
export type UserRole = "viewer" | "operator" | "admin";
