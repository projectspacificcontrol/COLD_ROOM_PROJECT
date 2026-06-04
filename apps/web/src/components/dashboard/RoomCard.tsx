import { ChevronRight } from "lucide-react";
import type { RoomSnapshot } from "../../types/dashboard";
import { statusLabel, statusStyles } from "./statusStyles";

interface Props {
  room: RoomSnapshot;
  onSelect: (room: RoomSnapshot) => void;
}

export function RoomCard({ room, onSelect }: Props) {
  const styles = statusStyles[room.status];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(room);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(room)}
      onKeyDown={handleKeyDown}
      aria-label={`Cold Room ${room.room_number}, status ${statusLabel(room.status)}, average temperature ${room.average_c !== null ? room.average_c.toFixed(1) : "--"} degrees Celsius`}
      className={`group flex flex-col justify-between min-h-[14rem] rounded-xl border p-5 text-left shadow-md select-none transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${styles.cardBg} ${styles.border} ${styles.hoverBorder} ${styles.shadow} hover:-translate-y-1`}
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-white group-hover:text-zinc-100 transition-colors">
            {room.room_name}
          </h3>
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-black select-none ${styles.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${styles.badgeDot} ${room.status === "normal" ? "animate-pulse" : ""}`} />
            {statusLabel(room.status)}
          </span>
        </div>
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest font-mono">Avg Temp</p>
        <p className="mb-4 text-4.5xl font-black text-white tracking-tight leading-none mt-1">
          {room.average_c === null ? "--" : `${room.average_c.toFixed(1)}°C`}
        </p>
      </div>

      <div>
        <div className="grid grid-cols-5 gap-1.5">
          {room.sensors.map((sensor) => {
            const isCritical = sensor.status === "critical";
            const isWarning = sensor.status === "warning";
            const isFault = sensor.status === "fault" || sensor.status === "offline";
            
            // High contrast text/label colors matching individual sensor status
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
              labelColor = "text-amber-300/80 font-black";
              chipBorder = "border-amber-900/60 bg-amber-950/20";
            } else if (isFault) {
              textColor = "text-zinc-400 font-bold";
              labelColor = "text-zinc-500 font-bold";
              chipBorder = "border-zinc-800/80 bg-zinc-950/10";
            }

            return (
              <div
                className={`rounded-lg bg-[#0B1117] border px-1 py-1.5 text-center flex flex-col justify-center min-h-[3rem] ${chipBorder}`}
                key={sensor.source_tag}
                title={`${sensor.source_tag} - Status: ${sensor.status}, Quality: ${sensor.quality}`}
              >
                <span className={`text-[9px] uppercase tracking-wider leading-none ${labelColor} font-mono`}>
                  {sensor.label}
                </span>
                <span className={`text-xs mt-1 truncate leading-none ${textColor}`} style={style}>
                  {sensor.value_c === null ? "N/A" : sensor.value_c.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4.5 flex items-center gap-0.5 text-xs font-black uppercase tracking-wider text-zinc-300 group-hover:text-blue-400 transition-colors font-mono">
          <span>Click for details</span>
          <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
