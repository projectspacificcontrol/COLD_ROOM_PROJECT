import { useEffect, useState, useRef } from "react";
import { X, Thermometer, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { HistoryPoint, RoomSnapshot } from "../../types/dashboard";
import { statusLabel, statusStyles } from "./statusStyles";

interface Props {
  room: RoomSnapshot | null;
  history: HistoryPoint[];
  onClose: () => void;
}

export function RoomDrawer({ room, history, onClose }: Props) {
  // Animating the drawer open/close
  const [activeRoom, setActiveRoom] = useState<RoomSnapshot | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (room) {
      setActiveRoom(room);
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => setActiveRoom(null), 300); // wait for transition
      return () => clearTimeout(t);
    }
  }, [room]);

  // Keyboard accessibility for ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && room) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [room, onClose]);

  // Ref and state for virtualization of the readings table
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 44; // Fixed row height in pixels
  const containerHeight = 220; // Fixed scrollable area height

  if (!activeRoom) {
    return null;
  }

  // Calculate statistics from the history logs
  const averages = history.flatMap((h) => (h.average_c !== null ? [h.average_c] : []));
  const minTemp = averages.length ? Math.min(...averages) : null;
  const maxTemp = averages.length ? Math.max(...averages) : null;
  const avgTemp = averages.length
    ? Number((averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1))
    : null;

  // Chart data formatting
  const chartData = history.map((point) => ({
    time: new Date(point.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    average: point.average_c
  }));

  // Style chart matching the room status
  let chartColor = "#10B981"; // green
  if (activeRoom.status === "critical") chartColor = "#EF4444"; // red
  else if (activeRoom.status === "warning") chartColor = "#F59E0B"; // orange

  // Virtualized table math
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = history.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(history.length - 1, Math.floor((scrollTop + containerHeight) / rowHeight) + 2);
  
  const visibleHistory = history.slice(startIndex, endIndex + 1);
  const paddingTop = startIndex * rowHeight;
  const paddingBottom = Math.max(0, totalHeight - (endIndex + 1) * rowHeight);

  const roomStyles = statusStyles[activeRoom.status];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end select-none transition-opacity duration-300 ${
        visible ? "pointer-events-auto bg-black/75" : "pointer-events-none bg-black/0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeRoom.room_name} detailed telemetry`}
    >
      {/* Backdrop close area */}
      <button
        className="absolute inset-0 cursor-default outline-none bg-transparent"
        onClick={onClose}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Drawer Panel */}
      <aside
        className={`relative h-full w-full max-w-xl flex flex-col bg-[#080D13] border-l border-[#263442] text-white shadow-2xl transition-transform duration-300 ease-out transform ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263442] px-6 py-5">
          <div>
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest font-mono">
              {activeRoom.group_code} <span className="text-zinc-500">//</span> Group Telemetry
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">{activeRoom.room_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:text-white border border-[#263442] hover:bg-zinc-800/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 transition"
            type="button"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Main Average & Status Block */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#263442] bg-[#111A22] p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wider font-mono">Avg Temp</span>
              <p className="text-4xl font-black text-white mt-2 tracking-tight">
                {activeRoom.average_c === null ? "--" : activeRoom.average_c.toFixed(1)}<span className="text-2xl font-bold text-zinc-400">°C</span>
              </p>
            </div>
            
            <div className="rounded-xl border border-[#263442] bg-[#111A22] p-4 flex flex-col justify-between shadow-sm">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wider font-mono">Current Status</span>
              <div className="mt-2.5">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black select-none ${roomStyles.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${roomStyles.badgeDot}`} />
                  {statusLabel(activeRoom.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Individual Sensors details */}
          <section className="rounded-xl border border-[#263442] bg-[#111A22]/50 p-4 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-mono border-b border-[#263442]/60 pb-2">
              <Thermometer className="h-4 w-4 text-blue-400" />
              Latest Sensor Readings
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {activeRoom.sensors.map((sensor) => {
                const isCritical = sensor.status === "critical";
                const isWarning = sensor.status === "warning";
                const isFault = sensor.status === "fault" || sensor.status === "offline";
                
                let textColor = "text-white font-bold";
                let labelColor = "text-zinc-400 font-bold";
                let chipBorder = "border-[#263442]";
                let style: React.CSSProperties = {};
                
                if (isCritical) {
                  textColor = "text-rose-500 font-black";
                  style = { color: "#FF99AB" };
                  labelColor = "text-rose-300/80 font-black";
                  chipBorder = "border-rose-900/60 bg-rose-950/20";
                } else if (isWarning) {
                  textColor = "text-amber-500 font-black";
                  style = { color: "#FCD34D" };
                  labelColor = "text-amber-300/85 font-black";
                  chipBorder = "border-amber-900/60 bg-amber-950/20";
                } else if (isFault) {
                  textColor = "text-zinc-400 font-bold";
                  labelColor = "text-zinc-500 font-bold";
                  chipBorder = "border-zinc-800/80 bg-zinc-950/15";
                }

                return (
                  <div
                    key={sensor.source_tag}
                    className={`rounded-lg bg-[#0B1117] border px-1 py-2 text-center select-none flex flex-col justify-between min-h-[4.5rem] ${chipBorder}`}
                  >
                    <span className={`text-[9px] uppercase tracking-wider leading-none font-mono ${labelColor}`}>{sensor.label}</span>
                    <span className={`text-base font-black mt-1 ${textColor}`} style={style}>
                      {sensor.value_c === null ? "N/A" : sensor.value_c.toFixed(1)}
                    </span>
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-wider font-mono">
                      {sensor.quality}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* History Chart */}
          <section className="rounded-xl border border-[#263442] bg-[#111A22]/50 p-4 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-mono border-b border-[#263442]/60 pb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Temperature History (Last 2 Hours)
            </h3>
            
            {history.length === 0 ? (
              <div className="h-48 flex items-center justify-center border border-dashed border-[#263442] rounded-lg bg-[#0B1117]/30">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="h-5 w-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-400 font-semibold">Loading historical data...</p>
                </div>
              </div>
            ) : (
              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c2730" />
                    <XAxis dataKey="time" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }} />
                    <YAxis
                      stroke="#4b5563"
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b1117",
                        border: "1px solid #263442",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "bold",
                        fontFamily: "monospace"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="average"
                      stroke={chartColor}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Historical Statistics */}
            {history.length > 0 && (
              <div className="grid grid-cols-3 gap-2 border-t border-[#263442]/60 pt-3.5 text-center text-xs">
                <div>
                  <p className="text-[10px] text-zinc-300 font-black uppercase tracking-wider font-mono">Min Logged</p>
                  <p className="font-black text-zinc-200 mt-1">{minTemp !== null ? `${minTemp.toFixed(1)}°C` : "--"}</p>
                </div>
                <div className="border-x border-[#263442]/60">
                  <p className="text-[10px] text-zinc-300 font-black uppercase tracking-wider font-mono">Avg Logged</p>
                  <p className="font-black text-zinc-200 mt-1">{avgTemp !== null ? `${avgTemp.toFixed(1)}°C` : "--"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-300 font-black uppercase tracking-wider font-mono">Max Logged</p>
                  <p className="font-black text-zinc-200 mt-1">{maxTemp !== null ? `${maxTemp.toFixed(1)}°C` : "--"}</p>
                </div>
              </div>
            )}
          </section>

          {/* Active Alerts & Faults */}
          <section className="rounded-xl border border-[#263442] bg-[#111A22]/50 p-4 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-mono border-b border-[#263442]/60 pb-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Active Incidents & Sensor Faults
            </h3>
            
            {activeRoom.active_alerts.length === 0 && !activeRoom.sensors.some((s) => s.status === "fault") ? (
              <p className="text-xs font-bold text-zinc-400">All room sensors reporting normal operating conditions.</p>
            ) : (
              <ul className="space-y-2">
                {activeRoom.active_alerts.map((alert, idx) => (
                  <li
                    className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-200 shadow-sm"
                    key={idx}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>{alert}</span>
                  </li>
                ))}
                {activeRoom.sensors
                  .filter((sensor) => sensor.status === "fault")
                  .map((sensor) => (
                    <li
                      className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs font-bold text-amber-200 shadow-sm"
                      key={sensor.source_tag}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>
                        Sensor <strong className="text-amber-100 font-black">{sensor.label}</strong> is offline. Tag:{" "}
                        <code className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/20 px-1 py-0.5 rounded border border-amber-900/30">{sensor.source_tag}</code>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {/* Recent Readings Table (Custom Virtualized rendering) */}
          <section className="rounded-xl border border-[#263442] bg-[#111A22]/50 p-4 space-y-3.5 shadow-sm">
            <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-mono border-b border-[#263442]/60 pb-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              Chronological Telemetry Logs
            </h3>

            {history.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center border border-[#263442] rounded-lg bg-[#0b1117]/30">
                <p className="text-xs text-zinc-400 font-semibold">Gathering telemetry logs...</p>
              </div>
            ) : (
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="relative overflow-y-auto border border-[#263442] rounded-lg bg-[#0b1117]/60"
                style={{ height: containerHeight }}
              >
                {/* Header is static and sticky */}
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead className="sticky top-0 z-10 bg-[#111A22] text-zinc-100 border-b border-[#263442] h-9">
                    <tr>
                      <th className="px-3 text-left font-black uppercase tracking-wider">Time</th>
                      <th className="px-2 text-center font-black uppercase tracking-wider">Avg</th>
                      <th className="px-1 text-center font-black tracking-wider">T1</th>
                      <th className="px-1 text-center font-black tracking-wider">T2</th>
                      <th className="px-1 text-center font-black tracking-wider">T3</th>
                      <th className="px-1 text-center font-black tracking-wider">T4</th>
                      <th className="px-1 text-center font-black tracking-wider">T5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Padding block representing scrolled out of view items */}
                    {paddingTop > 0 && (
                      <tr>
                        <td style={{ height: paddingTop }} colSpan={7} />
                      </tr>
                    )}

                    {visibleHistory.map((point) => {
                      const timeStr = new Date(point.logged_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      });
                      
                      return (
                        <tr
                          key={point.logged_at}
                          className="border-b border-[#263442]/30 hover:bg-[#111a22]/30 even:bg-[#111a22]/10 text-[11px]"
                          style={{ height: rowHeight }}
                        >
                          <td className="px-3 font-semibold text-zinc-300 font-mono">{timeStr}</td>
                          <td className="px-2 text-center font-black text-white">
                            {point.average_c !== null ? `${point.average_c.toFixed(1)}°` : "--"}
                          </td>
                          {Array.from({ length: 5 }).map((_, sIdx) => {
                            const sensor = point.sensors[sIdx];
                            const val = sensor?.value_c;
                            let cellColor = "text-zinc-200";
                            let style: React.CSSProperties = {};
                            
                            if (sensor?.status === "critical") {
                              cellColor = "font-black";
                              style = { color: "#FF99AB" };
                            } else if (sensor?.status === "warning") {
                              cellColor = "font-black";
                              style = { color: "#FCD34D" };
                            } else if (sensor?.status === "fault" || sensor?.status === "offline") {
                              cellColor = "text-zinc-500 font-bold";
                            }

                            return (
                              <td key={sIdx} className={`px-1 text-center font-mono ${cellColor}`} style={style}>
                                {val !== undefined && val !== null ? val.toFixed(1) : "--"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Padding block representing remaining offscreen items */}
                    {paddingBottom > 0 && (
                      <tr>
                        <td style={{ height: paddingBottom }} colSpan={7} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
