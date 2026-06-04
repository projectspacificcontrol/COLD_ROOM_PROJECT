import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, fetchRoomHistory, subscribeDashboard } from "../api/client";
import type { DashboardSnapshot, HistoryPoint, RoomSnapshot, ConnectionState } from "../types/dashboard";

export function useDashboard(refreshTrigger = 0) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("reconnecting");
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // Set to reconnecting when refetching
    setConnectionState("reconnecting");
    
    fetchDashboard()
      .then((data) => {
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
          setConnectionState("live");
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          if (err.message === "403_FORBIDDEN") {
            setConnectionState("offline");
          }
        }
      });

    const unsubscribe = subscribeDashboard(
      (data) => {
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      },
      (state) => {
        if (!cancelled) {
          setConnectionState(state);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshTrigger]);

  useEffect(() => {
    if (!selectedRoom) {
      setHistory([]);
      return;
    }
    
    let cancelled = false;
    setLoadingHistory(true);
    setHistory([]); // Reset list on room transition

    fetchRoomHistory(selectedRoom.room_number)
      .then((points) => {
        if (!cancelled) {
          setHistory(points);
          setLoadingHistory(false);
        }
      })
      .catch((err: Error) => {
        console.error("Failed to fetch room history:", err);
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRoom, refreshTrigger]);

  // Keep the selected room's snapshot fresh in sync with incoming SSE snapshots
  const activeRoomDetail = useMemo(() => {
    if (!selectedRoom || !snapshot) return selectedRoom;
    return snapshot.groups
      .flatMap((g) => g.rooms)
      .find((r) => r.room_number === selectedRoom.room_number) ?? selectedRoom;
  }, [selectedRoom, snapshot]);

  const rooms = useMemo(() => snapshot?.groups.flatMap((group) => group.rooms) ?? [], [snapshot]);

  return {
    snapshot,
    rooms,
    selectedRoom: activeRoomDetail,
    history,
    error,
    connectionState,
    loadingHistory,
    setSelectedRoom,
    setError
  };
}
