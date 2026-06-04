import { expectedSensorTags, roomGroups } from "../config/rooms";
import type { DashboardSnapshot, HistoryPoint, RoomSnapshot, SensorReading, Status } from "../types/dashboard";

function statusFor(value: number | null, quality: SensorReading["quality"]): Status {
  if (quality !== "good" || value === null) return "fault";
  if (value >= 7) return "critical";
  if (value >= 5.5) return "warning";
  return "normal";
}

function roomStatus(statuses: Status[]): Status {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("fault")) return "fault";
  return "normal";
}

export function fixtureDashboard(): DashboardSnapshot {
  const now = new Date().toISOString();
  const allValues: number[] = [];
  let activeAlerts = 0;
  let warningAlerts = 0;
  let criticalAlerts = 0;
  let sensorFaults = 0;

  const groups = roomGroups.map((group) => {
    const rooms: RoomSnapshot[] = group.roomNumbers.map((roomNumber) => {
      const sensors: SensorReading[] = expectedSensorTags
        .filter((sensor) => sensor.roomNumber === roomNumber)
        .map((sensor, index) => {
          const unavailable = roomNumber === 18;
          const critical = [3, 5, 12, 14].includes(roomNumber);
          const warning = roomNumber === 4 && index === 3;
          const value = unavailable ? null : critical ? 7.1 + index * 0.25 : warning ? 5.8 : 3.4 + ((roomNumber + index) % 5) * 0.45;
          const quality: SensorReading["quality"] = unavailable ? "unavailable" : "good";
          const status = statusFor(value, quality);
          if (status === "fault") sensorFaults += 1;
          if (quality === "good" && value !== null) allValues.push(value);
          return {
            source_tag: sensor.sourceTag,
            label: sensor.label,
            value_c: value === null ? null : Number(value.toFixed(1)),
            quality,
            status
          };
        });

      const values = sensors.flatMap((sensor) => (sensor.value_c === null ? [] : [sensor.value_c]));
      const status = roomStatus(sensors.map((sensor) => sensor.status));
      if (status === "critical") criticalAlerts += 1;
      if (status === "warning") warningAlerts += 1;
      if (status === "critical" || status === "warning") activeAlerts += 1;
      return {
        room_number: roomNumber,
        room_name: `Cold Room ${roomNumber}`,
        group_code: group.groupCode,
        average_c: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null,
        status,
        sensors,
        active_alerts: status === "critical" || status === "warning" ? [`${status.toUpperCase()} threshold condition`] : []
      };
    });

    return {
      group_code: group.groupCode,
      room_numbers: [...group.roomNumbers],
      rooms
    };
  });

  return {
    overview: {
      total_rooms: 18,
      total_sensors: 90,
      average_c: Number((allValues.reduce((sum, value) => sum + value, 0) / allValues.length).toFixed(1)),
      active_alerts: activeAlerts,
      critical_alerts: criticalAlerts,
      warning_alerts: warningAlerts,
      sensor_faults: sensorFaults,
      last_log_time: now
    },
    groups
  };
}

export function fixtureHistory(roomNumber: number): HistoryPoint[] {
  return Array.from({ length: 24 }, (_, index) => {
    const snapshot = fixtureDashboard();
    const room = snapshot.groups.flatMap((group) => group.rooms).find((item) => item.room_number === roomNumber);
    return {
      logged_at: new Date(Date.now() - (23 - index) * 300000).toISOString(),
      average_c: room?.average_c ?? null,
      sensors: room?.sensors ?? []
    };
  });
}

