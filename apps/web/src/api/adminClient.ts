import type {
  AdminAlert,
  AdminOverview,
  AdminRoom,
  AuditLog,
  CurrentUser,
  IpAllowlistEntry,
  SensorFault,
  SystemSetting,
  ThresholdRule,
  UserRecord
} from "../types/admin";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

let csrfToken: string | null = null;

async function csrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to establish secure session");
  csrfToken = (await response.json()).csrf_token;
  return csrfToken!;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (method !== "GET") headers.set("X-CSRF-Token", await csrf());
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401) throw new Error("UNAUTHENTICATED");
  if (response.status === 403) throw new Error("FORBIDDEN");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const adminApi = {
  async login(email: string, password: string) {
    await csrf();
    return request<{ status: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  me: () => request<CurrentUser>("/auth/me"),
  logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),
  overview: () => request<AdminOverview>("/admin/overview"),
  users: () => request<UserRecord[]>("/admin/users"),
  createUser: (payload: Record<string, unknown>) => request<UserRecord>("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: Record<string, unknown>) => request<UserRecord>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id: number) => request<{ status: string }>(`/admin/users/${id}`, { method: "DELETE" }),
  ipAllowlist: () => request<IpAllowlistEntry[]>("/admin/ip-allowlist"),
  createIp: (payload: Record<string, unknown>) => request<{ id: number }>("/admin/ip-allowlist", { method: "POST", body: JSON.stringify(payload) }),
  updateIp: (id: number, payload: Record<string, unknown>) => request<IpAllowlistEntry>(`/admin/ip-allowlist/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteIp: (id: number) => request<{ status: string }>(`/admin/ip-allowlist/${id}`, { method: "DELETE" }),
  thresholds: () => request<ThresholdRule[]>("/admin/thresholds"),
  upsertThreshold: (payload: Record<string, unknown>) => request<{ id: number }>("/admin/thresholds", { method: "POST", body: JSON.stringify(payload) }),
  deleteThreshold: (id: number) => request<{ status: string }>(`/admin/thresholds/${id}`, { method: "DELETE" }),
  effectiveThreshold: (query: string) => request<{ rule: ThresholdRule | null }>(`/admin/thresholds/effective?${query}`),
  rooms: () => request<AdminRoom[]>("/admin/rooms"),
  health: () => request<Array<Record<string, unknown>>>("/admin/system-health"),
  auditLogs: () => request<AuditLog[]>("/admin/audit-logs"),
  alerts: () => request<AdminAlert[]>("/admin/alerts"),
  sensorFaults: () => request<SensorFault[]>("/admin/sensor-faults"),
  settings: () => request<SystemSetting[]>("/admin/settings"),
  saveSetting: (key: string, payload: Record<string, unknown>) => request<{ status: string }>(`/admin/settings/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(payload) }),
  async downloadReport(params: URLSearchParams) {
    const response = await fetch(`${API_BASE_URL}/admin/reports/export?${params}`, { credentials: "include" });
    if (!response.ok) throw new Error("Report export failed");
    return response.blob();
  }
};
