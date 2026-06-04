import { useMemo, useState } from "react";
import { CheckCircle2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { FilterTabs, type RoomFilter } from "./components/dashboard/FilterTabs";
import { OverviewCards } from "./components/dashboard/OverviewCards";
import { RoomDrawer } from "./components/dashboard/RoomDrawer";
import { RoomGroup } from "./components/dashboard/RoomGroup";
import { AdminPanel } from "./components/admin/AdminPanel";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { OverviewSkeleton, RoomGridSkeleton } from "./components/shared/SkeletonLoader";
import { ForbiddenScreen } from "./components/shared/ForbiddenScreen";
import { useDashboard } from "./hooks/useDashboard";
import type { UserRole } from "./types/dashboard";
import { AdminApp } from "./admin/AdminApp";

export function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  const [role, setRole] = useState<UserRole>("admin");
  const [ipBlocked, setIpBlocked] = useState(() => localStorage.getItem("SIMULATE_IP_BLOCK") === "true");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    snapshot,
    rooms,
    selectedRoom,
    history,
    error,
    connectionState,
    setSelectedRoom,
    setError
  } = useDashboard(refreshTrigger);

  const [filter, setFilter] = useState<RoomFilter>("all");

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

  const toggleIpBlock = () => {
    const nextVal = !ipBlocked;
    localStorage.setItem("SIMULATE_IP_BLOCK", nextVal ? "true" : "false");
    setIpBlocked(nextVal);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUnlockRequest = () => {
    setRole("admin");
  };

  // 403 Forbidden Screen handling
  if (error === "403_FORBIDDEN") {
    return (
      <ForbiddenScreen
        isSimulated={ipBlocked}
        onDisableSimulation={toggleIpBlock}
        onRetry={() => setRefreshTrigger((prev) => prev + 1)}
      />
    );
  }

  // General error handling
  if (error && error !== "403_FORBIDDEN") {
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

            {/* Simulated environment controllers */}
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

              {/* Mock Auth Gate Dropdown */}
              <div className="inline-flex items-center gap-2 bg-[#111A22]/70 border border-[#263442] px-3 py-1.5 rounded-lg">
                <span className="text-[9px] font-black text-zinc-450 uppercase tracking-widest font-mono">Role:</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="bg-transparent text-xs font-black text-white outline-none cursor-pointer border-none py-0.5 hover:text-zinc-200 transition font-mono uppercase tracking-wider"
                  aria-label="Toggle user authorization role"
                >
                  <option value="admin" className="bg-[#111A22] text-white font-semibold">Administrator</option>
                  <option value="operator" className="bg-[#111A22] text-white font-semibold">Operator</option>
                  <option value="viewer" className="bg-[#111A22] text-white font-semibold">Viewer (ReadOnly)</option>
                </select>
              </div>

              {/* IP Allowlist Simulation Switcher */}
              <button
                onClick={toggleIpBlock}
                className={`text-xs font-black uppercase tracking-wider font-mono px-3.5 py-1.5 rounded-lg border transition select-none cursor-pointer outline-none active:scale-95 ${
                  ipBlocked
                    ? "bg-rose-600 border-rose-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse"
                    : "bg-[#111A22]/60 border-[#263442] text-zinc-300 hover:text-white hover:border-[#384c60] hover:bg-[#111A22]"
                }`}
                type="button"
                aria-label={ipBlocked ? "Disable IP Address allowlist restriction simulation" : "Enable IP Address allowlist restriction simulation"}
              >
                {ipBlocked ? "Simulating Blocked IP" : "Simulate 403 WAN"}
              </button>
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

              {/* Secured Administrator Actions */}
              <AdminPanel role={role} onUnlockRequest={handleUnlockRequest} />
            </>
          )}

          {/* Details Drawer Component */}
          <RoomDrawer room={selectedRoom} history={history} onClose={() => setSelectedRoom(null)} />
        </div>
      </main>
    </ErrorBoundary>
  );
}
