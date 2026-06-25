import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { FilterTabs, type RoomFilter } from "./components/dashboard/FilterTabs";
import { OverviewCards } from "./components/dashboard/OverviewCards";
import { RoomDrawer } from "./components/dashboard/RoomDrawer";
import { RoomGroup } from "./components/dashboard/RoomGroup";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { OverviewSkeleton, RoomGridSkeleton } from "./components/shared/SkeletonLoader";
import { ForbiddenScreen } from "./components/shared/ForbiddenScreen";
import { UserBadge } from "./components/shared/UserBadge";
import { LoginScreen } from "./components/auth/LoginScreen";
import { useDashboard } from "./hooks/useDashboard";
import { adminApi } from "./api/adminClient";
import type { CurrentUser } from "./types/admin";
import { AdminApp } from "./admin/AdminApp";

// Login is always required when running the real app — every visitor must
// authenticate with an admin-issued email + password before the dashboard
// opens. Only the unit-test runner (vitest, mode === "test") bypasses the gate,
// since it renders against fixtures with no backend to authenticate against.
const AUTH_REQUIRED = import.meta.env.MODE !== "test";
const DEMO_USER: CurrentUser = { id: 0, email: "demo@sensorcloud.local", role: "admin" };

export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }
  return <DashboardGate />;
}

function DashboardGate() {
  const [user, setUser] = useState<CurrentUser | null>(AUTH_REQUIRED ? null : DEMO_USER);
  const [checking, setChecking] = useState(AUTH_REQUIRED);

  // Resume an existing session on load so a logged-in operator is not forced to
  // re-authenticate on every refresh.
  useEffect(() => {
    if (!AUTH_REQUIRED) return;
    let cancelled = false;
    adminApi
      .me()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    if (AUTH_REQUIRED) {
      await adminApi.logout().catch(() => undefined);
    }
    setUser(null);
  }, []);

  if (checking) {
    return <SessionLoading />;
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <DashboardView user={user} onLogout={handleLogout} />;
}

function SessionLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top_left,#152232,#0b1117_60%)] text-sm font-semibold text-zinc-300">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#10B981]" />
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Verifying secure session…</span>
      </div>
    </main>
  );
}

function DashboardView({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    snapshot,
    rooms,
    selectedRoom,
    history,
    error,
    connectionState,
    setSelectedRoom
  } = useDashboard(refreshTrigger);

  const [filter, setFilter] = useState<RoomFilter>("all");

  // A 401 means the session expired or was revoked — return to the login screen.
  useEffect(() => {
    if (error === "UNAUTHENTICATED") {
      onLogout();
    }
  }, [error, onLogout]);

  const counts = useMemo(
    () => ({
      all: rooms.length,
      normal: rooms.filter((room) => room.status === "normal").length,
      warning: rooms.filter((room) => room.status === "warning").length,
      critical: rooms.filter((room) => room.status === "critical").length,
      fault_offline: rooms.filter((room) => room.status === "fault" || room.status === "offline").length
    }),
    [rooms]
  );

  // Determine if there are rooms matching the active status filter
  const hasRoomsInFilter = useMemo(() => {
    if (!snapshot) return true;
    return snapshot.groups.some((group) =>
      group.rooms.some((room) => {
        if (filter === "all") return true;
        if (filter === "fault_offline") return room.status === "fault" || room.status === "offline";
        return room.status === filter;
      })
    );
  }, [snapshot, filter]);

  // Session expiring — hold a quiet loading state while the gate swaps in the login screen.
  if (error === "UNAUTHENTICATED") {
    return <SessionLoading />;
  }

  // 403 Forbidden Screen handling (IP allowlist enforced by the API)
  if (error === "403_FORBIDDEN") {
    return <ForbiddenScreen onRetry={() => setRefreshTrigger((prev) => prev + 1)} />;
  }

  // General error handling
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#152232,#0b1117_60%)] p-6 text-white text-center">
        <div className="max-w-md rounded-xl border border-[#263442] bg-[#111A22] p-8 space-y-4 shadow-md">
          <p className="text-xs font-black uppercase tracking-widest text-rose-500 font-mono">Telemetry Fetch Failed</p>
          <h2 className="text-xl font-black text-white">Cannot connect to server</h2>
          <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
            {error || "An unknown network error occurred while communicating with the telemetry API endpoints."}
          </p>
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white border border-[#263442] transition active:scale-95 cursor-pointer font-mono"
            type="button"
          >
            Retry Connection
          </button>
        </div>
      </main>
    );
  }

  // Filter labels for display inside Empty State
  const filterLabels: Record<RoomFilter, string> = {
    all: "All Rooms",
    normal: "Normal",
    warning: "Warning",
    critical: "Critical",
    fault_offline: "Fault / Offline"
  };

  return (
    <ErrorBoundary>
      <main className="dashboard-readable min-h-screen bg-[radial-gradient(ellipse_at_top_left,#152232,#0b1117_60%)] px-4 py-6 text-white sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header Section */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#263442] pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">SensorCloud // Industrial Telemetry</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Cold Storage Temperature Dashboard</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              {/* Connection Indicator Widget */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black select-none font-mono ${
                  connectionState === "live"
                    ? "bg-[#10b981]/10 border-[#10b981]/25 text-[#10B981]"
                    : connectionState === "reconnecting"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                    : "bg-[#111A22] border-[#263442] text-zinc-400"
                }`}
                title={`Telemetry connection status: ${connectionState.toUpperCase()}`}
              >
                {connectionState === "live" ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-[#10B981] animate-pulse" />
                    <span>SSE LIVE</span>
                  </>
                ) : connectionState === "reconnecting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                    <span>RECONNECTING</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-zinc-400" />
                    <span>OFFLINE</span>
                  </>
                )}
              </div>

              {/* Authenticated session badge — round avatar, click for details + logout.
                  Logout is offered only for real sessions (demo mode has no backend session). */}
              <UserBadge
                email={user.email}
                role={user.role}
                accent="emerald"
                onLogout={AUTH_REQUIRED ? onLogout : undefined}
              />
            </div>
          </header>

          {/* Skeleton Loaders or Main Render */}
          {!snapshot ? (
            <div className="space-y-6">
              <OverviewSkeleton />
              <div className="space-y-4">
                <div className="h-8 w-48 bg-[#111A22] rounded animate-pulse" />
                <div className="h-10 w-96 bg-[#111A22] rounded animate-pulse" />
                <RoomGridSkeleton />
              </div>
            </div>
          ) : (
            <>
              {/* Metrics Overview Cards */}
              <OverviewCards overview={snapshot.overview} />

              {/* Filter controls */}
              <section className="space-y-5" aria-labelledby="rooms-title">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263442]/60 pb-3">
                  <h2 id="rooms-title" className="text-base font-black text-white flex items-center gap-2 tracking-tight">
                    Cold Rooms By Group
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono hidden sm:inline">- select any card for raw sensor charts</span>
                  </h2>
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest font-mono bg-[#111A22]/50 px-2.5 py-1 rounded-md border border-[#263442]/40">
                    Last Log: {snapshot.overview.last_log_time ? new Date(snapshot.overview.last_log_time).toLocaleTimeString() : "pending"}
                  </p>
                </div>

                <FilterTabs active={filter} counts={counts} onChange={setFilter} />

                {/* Grid of rooms or Centered Empty State */}
                {!hasRoomsInFilter ? (
                  <div className="flex flex-col items-center justify-center border border-dashed border-[#263442] rounded-xl bg-[#111A22]/10 py-16 px-4 text-center shadow-sm">
                    <div className="rounded-full bg-[#111A22] p-4.5 border border-[#263442] mb-3.5">
                      <CheckCircle2 className="h-8 w-8 text-zinc-500" />
                    </div>
                    <h3 className="text-base font-black text-white">No Telemetry Incidents</h3>
                    <p className="mt-1.5 text-xs font-semibold text-zinc-400 max-w-sm leading-relaxed">
                      There are no active cold rooms matching the filter <strong className="text-zinc-300">"{filterLabels[filter]}"</strong>. All operational statistics are within threshold parameters.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {snapshot.groups.map((group) => (
                      <RoomGroup key={group.group_code} group={group} filter={filter} onSelectRoom={setSelectedRoom} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Details Drawer Component */}
          <RoomDrawer room={selectedRoom} history={history} onClose={() => setSelectedRoom(null)} />
        </div>
      </main>
    </ErrorBoundary>
  );
}
