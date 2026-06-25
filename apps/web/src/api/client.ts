import { z } from "zod";
import type { DashboardSnapshot, HistoryPoint, ConnectionState } from "../types/dashboard";
import { fixtureDashboard, fixtureHistory } from "./fixtures";

// Same-origin by default (served via the Vite dev proxy or the prod nginx
// gateway) so auth cookies stay first-party. Override only for split deployments.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES !== "false";

// --- Zod Runtime Validation Schemas ---

export const StatusSchema = z.enum(["normal", "warning", "critical", "fault", "offline"]);
export const QualitySchema = z.enum(["good", "missing", "invalid", "unavailable", "impossible", "stale"]);

export const SensorReadingSchema = z.object({
  source_tag: z.string(),
  label: z.string(),
  value_c: z.number().nullable(),
  quality: QualitySchema,
  status: StatusSchema
});

export const RoomSnapshotSchema = z.object({
  room_id: z.number().optional(),
  room_number: z.number(),
  room_name: z.string(),
  group_code: z.string(),
  average_c: z.number().nullable(),
  status: StatusSchema,
  sensors: z.array(SensorReadingSchema),
  active_alerts: z.array(z.string()),
  latest_log_time: z.string().nullable().optional()
});

export const GroupSnapshotSchema = z.object({
  group_code: z.string(),
  room_numbers: z.array(z.number()),
  rooms: z.array(RoomSnapshotSchema)
});

export const OverviewSchema = z.object({
  total_rooms: z.number(),
  total_sensors: z.number(),
  average_c: z.number().nullable(),
  active_alerts: z.number(),
  critical_alerts: z.number(),
  warning_alerts: z.number(),
  sensor_faults: z.number(),
  last_log_time: z.string().nullable()
});

export const DashboardSnapshotSchema = z.object({
  overview: OverviewSchema,
  groups: z.array(GroupSnapshotSchema)
});

export const HistoryPointSchema = z.object({
  logged_at: z.string(),
  average_c: z.number().nullable(),
  sensors: z.array(SensorReadingSchema)
});

// --- API Client Implementation ---

export async function fetchDashboard(): Promise<DashboardSnapshot> {
  if (USE_FIXTURES) {
    // Simulate a tiny network latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Check if simulate IP block is flagged in localStorage (for test controls)
    if (localStorage.getItem("SIMULATE_IP_BLOCK") === "true") {
      throw new Error("403_FORBIDDEN");
    }
    
    return DashboardSnapshotSchema.parse(fixtureDashboard());
  }

  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, { credentials: "include" });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (response.status === 403) {
    throw new Error("403_FORBIDDEN");
  }

  if (!response.ok) {
    throw new Error("Unable to fetch dashboard snapshot");
  }
  
  const data = await response.json();
  return DashboardSnapshotSchema.parse(data);
}

export async function fetchRoomHistory(roomNumber: number): Promise<HistoryPoint[]> {
  if (USE_FIXTURES) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return z.array(HistoryPointSchema).parse(fixtureHistory(roomNumber));
  }

  const response = await fetch(`${API_BASE_URL}/dashboard/rooms/${roomNumber}/history`, { credentials: "include" });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (response.status === 403) {
    throw new Error("403_FORBIDDEN");
  }

  if (!response.ok) {
    throw new Error("Unable to fetch room history");
  }
  
  const data = await response.json();
  return z.array(HistoryPointSchema).parse(data);
}

export function subscribeDashboard(
  onSnapshot: (snapshot: DashboardSnapshot) => void,
  onConnectionStateChange?: (state: ConnectionState) => void
): () => void {
  let fallbackTimer: number | undefined;

  // Trigger initial reconnecting simulation for visuals
  onConnectionStateChange?.("reconnecting");

  if (USE_FIXTURES || typeof EventSource === "undefined") {
    // Simulate initial latency for connection handshake
    const connTimer = setTimeout(() => {
      onConnectionStateChange?.("live");
    }, 1000);

    const timer = window.setInterval(async () => {
      // If simulated IP block is active, simulate offlining
      if (localStorage.getItem("SIMULATE_IP_BLOCK") === "true") {
        onConnectionStateChange?.("offline");
        return;
      }
      
      try {
        const snap = await fetchDashboard();
        onSnapshot(snap);
        onConnectionStateChange?.("live");
      } catch (err) {
        if ((err as Error).message === "403_FORBIDDEN") {
          onConnectionStateChange?.("offline");
        }
      }
    }, 8000); // Poll slightly faster in dev fixtures for responsiveness

    return () => {
      clearTimeout(connTimer);
      window.clearInterval(timer);
    };
  }

  const source = new EventSource(`${API_BASE_URL}/live`, { withCredentials: true });

  source.onopen = () => {
    onConnectionStateChange?.("live");
  };

  source.addEventListener("dashboard.snapshot", (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data);
      const validated = DashboardSnapshotSchema.parse(data);
      onSnapshot(validated);
    } catch (err) {
      console.error("Zod Schema Validation Error on SSE stream:", err);
    }
  });

  source.onerror = () => {
    onConnectionStateChange?.("offline");
    source.close();
    
    // Fallback standard polling
    onConnectionStateChange?.("reconnecting");
    fallbackTimer = window.setInterval(async () => {
      try {
        const snap = await fetchDashboard();
        onSnapshot(snap);
        onConnectionStateChange?.("live");
      } catch (err) {
        onConnectionStateChange?.("offline");
      }
    }, 15000);
  };

  return () => {
    source.close();
    if (fallbackTimer) {
      window.clearInterval(fallbackTimer);
    }
  };
}
