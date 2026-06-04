import { Download, ListChecks, Shield, Users, Lock } from "lucide-react";
import type { UserRole } from "../../types/dashboard";

interface Props {
  role: UserRole;
  onUnlockRequest?: () => void;
}

export function AdminPanel({ role, onUnlockRequest }: Props) {
  const isLocked = role === "viewer";
  
  const items = [
    { label: "IP Allowlist", value: "Middleware enforced", icon: Shield, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Thresholds", value: "Global, group, room, sensor", icon: ListChecks, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Users And Roles", value: "Admin, operator, viewer", icon: Users, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { label: "Reports", value: "Excel date range export", icon: Download, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" }
  ];

  return (
    <section className="relative rounded-xl border border-[#263442] bg-[#111A22]/50 p-5 overflow-hidden select-none shadow-md">
      {/* Blurred lock overlay for viewer role */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B1117]/85 backdrop-blur-[2px] transition-all duration-300">
          <div className="flex flex-col items-center text-center p-6 max-w-sm">
            <div className="mb-3.5 rounded-full bg-amber-500/10 p-3.5 ring-1 ring-amber-500/35">
              <Lock className="h-6 w-6 text-amber-500 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-white">Security Restriction</h3>
            <p className="mt-1.5 text-xs font-semibold text-zinc-400 leading-relaxed">
              Your session is in Viewer mode. Elevated Admin or Operator privileges are required to configure cold rooms.
            </p>
            {onUnlockRequest && (
              <button
                onClick={onUnlockRequest}
                className="mt-4.5 rounded-lg bg-white hover:bg-zinc-200 px-4 py-2 text-xs font-black text-[#0B1117] transition cursor-pointer select-none active:scale-95 shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                type="button"
              >
                Authenticate Role
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Panel Header */}
      <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 transition-all duration-300 ${isLocked ? "blur-[1px] opacity-25" : ""}`}>
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">System Administration</h2>
          <p className="text-xs font-bold text-zinc-300 mt-0.5">Secure configuration forms and compliance reports.</p>
        </div>
        <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 font-mono">
          SYSTEM SECURE
        </span>
      </div>

      {/* Operations Grid */}
      <div className={`grid gap-4 md:grid-cols-4 transition-all duration-300 ${isLocked ? "blur-[1px] opacity-25" : ""}`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              className="group rounded-xl border border-[#263442] bg-[#0B1117]/60 p-4 transition-all hover:bg-[#0B1117] hover:border-[#384c60]"
              key={item.label}
            >
              <div className={`mb-3.5 rounded-lg border p-2 w-fit transition ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-white">{item.label}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-300 leading-snug">{item.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
