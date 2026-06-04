import { ShieldAlert, RefreshCw, HelpCircle } from "lucide-react";

interface Props {
  onRetry?: () => void;
  onDisableSimulation?: () => void;
  isSimulated?: boolean;
}

export function ForbiddenScreen({ onRetry, onDisableSimulation, isSimulated }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#111e2f,#0B1117_60%)] p-6 text-white">
      <div className="w-full max-w-lg rounded-xl border border-rose-500/30 bg-[#111A22] p-8 shadow-[0_0_30px_rgba(239,68,68,0.12)] backdrop-blur-md">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-rose-500/10 p-4.5 ring-1 ring-rose-500/30 animate-pulse">
            <ShieldAlert className="h-12 w-12 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Access Not Allowed</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-400">
            Access to the Cold Storage Temperature Dashboard is restricted.
          </p>

          <div className="my-6 w-full rounded-xl border border-[#263442] bg-[#0B1117] p-5 text-left text-sm space-y-3.5 shadow-sm">
            <div className="flex justify-between border-b border-[#263442]/60 pb-2">
              <span className="font-bold text-zinc-400 font-mono text-xs uppercase tracking-wider">Security Rule:</span>
              <span className="font-mono font-black text-rose-400 text-xs">IP ALLOWLIST ENFORCED</span>
            </div>
            <div className="flex justify-between border-b border-[#263442]/60 pb-2">
              <span className="font-bold text-zinc-400 font-mono text-xs uppercase tracking-wider">Detected IP:</span>
              <span className="font-mono font-black text-zinc-100 text-xs">198.51.100.72</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="font-bold text-zinc-400 font-mono text-xs uppercase tracking-wider">Location Tag:</span>
              <span className="font-mono font-black text-zinc-200 text-xs">Remote WAN Client</span>
            </div>
            <p className="text-xs text-zinc-400 pt-3 leading-relaxed border-t border-[#263442]/60 font-semibold">
              The security policy enforces that all operator dashboards must be accessed via authorized corporate VPN tunnels or local control room static IP ranges.
            </p>
          </div>

          <div className="flex flex-col w-full gap-3 sm:flex-row">
            <button
              onClick={onRetry}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-3 text-xs font-black uppercase tracking-wider text-white border border-[#263442] transition active:scale-95 cursor-pointer font-mono"
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </button>
            {isSimulated && onDisableSimulation && (
              <button
                onClick={onDisableSimulation}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 cursor-pointer font-mono shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                type="button"
              >
                Disable IP Simulation
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs font-bold text-zinc-400">
            <HelpCircle className="h-4 w-4 text-zinc-500" />
            <span>Need assistance? Contact</span>
            <a href="mailto:noc@sensorcloud.local" className="text-zinc-200 hover:underline font-mono font-bold">
              noc@sensorcloud.local
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
