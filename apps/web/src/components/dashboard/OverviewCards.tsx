import { Activity, AlertTriangle, Gauge, Thermometer, Warehouse } from "lucide-react";
import type { Overview } from "../../types/dashboard";

interface Props {
  overview: Overview;
}

export function OverviewCards({ overview }: Props) {
  const cards = [
    { 
      label: "Total Rooms", 
      value: overview.total_rooms, 
      sub: "6 groups x 3 rooms", 
      icon: Warehouse,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    { 
      label: "Total Sensors", 
      value: overview.total_sensors, 
      sub: "5 per room", 
      icon: Thermometer,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    { 
      label: "Avg Temperature", 
      value: `${overview.average_c?.toFixed(1) ?? "--"}°C`, 
      sub: "All active sensors", 
      icon: Gauge,
      iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    },
    {
      label: "Active Alerts",
      value: overview.active_alerts,
      sub: `${overview.critical_alerts} critical, ${overview.warning_alerts} warning`,
      icon: AlertTriangle,
      accent: "text-rose-500",
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20"
    },
    { 
      label: "Sensor Faults", 
      value: overview.sensor_faults, 
      sub: `Out of ${overview.total_sensors}`, 
      icon: Activity, 
      accent: "text-amber-500",
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20" 
    }
  ];

  return (
    <section aria-labelledby="overview-title">
      <h2 id="overview-title" className="mb-3.5 text-xs font-black uppercase tracking-wider text-zinc-300 font-mono">
        Overview Statistics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              className="group rounded-xl border border-[#263442] bg-[#111A22] px-5 py-4.5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-[#384c60]" 
              key={card.label}
            >
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-[#E2E8F0] font-mono">{card.label}</p>
                <div className={`rounded-lg border p-1.5 transition ${card.iconColor}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p className={`text-3.5xl font-black tracking-tight text-white group-hover:scale-[1.01] transition-transform ${card.accent ?? "text-white"}`}>
                {card.value}
              </p>
              <p className="mt-1.5 text-xs font-bold text-zinc-300">{card.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
