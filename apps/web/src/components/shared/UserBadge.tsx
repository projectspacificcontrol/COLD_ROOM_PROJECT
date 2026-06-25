import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operator: "Operator",
  viewer: "Viewer"
};

type Accent = "emerald" | "sky";

const ACCENT: Record<Accent, { tag: string; ring: string; popover: string; roleText: string; logout: string }> = {
  emerald: {
    tag: "border-[#10b981]/35 bg-[#10b981]/10 text-[#10B981] hover:border-[#10b981]/60",
    ring: "focus-visible:ring-[#10b981]/40",
    popover: "border-[#263442] bg-[#111A22]",
    roleText: "text-[#10B981]",
    logout: "border-[#263442] bg-[#0B1117]/60 text-zinc-300 hover:border-rose-500/40 hover:text-rose-400"
  },
  sky: {
    tag: "border-sky-500/35 bg-sky-500/10 text-sky-300 hover:border-sky-500/60",
    ring: "focus-visible:ring-sky-500/40",
    popover: "border-slate-800 bg-[#0d1420]",
    roleText: "text-sky-300",
    logout: "border-slate-700 bg-[#0a0f18] text-slate-300 hover:border-rose-500/40 hover:text-rose-400"
  }
};

interface Props {
  email: string;
  role: string;
  accent?: Accent;
  onLogout?: () => void;
}

/**
 * Session badge showing the account's role name (Admin / Operator / Viewer).
 * Clicking it reveals a popover with the full email and a Logout action.
 */
export function UserBadge({ email, role, accent = "emerald", onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = ACCENT[accent];
  const roleLabel = ROLE_LABELS[role] ?? role;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center rounded-lg border px-3.5 py-1.5 text-xs font-black uppercase tracking-wider outline-none transition active:scale-95 focus-visible:ring-2 ${theme.tag} ${theme.ring}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Account: ${email}, ${roleLabel}`}
        title={`${email} · ${roleLabel}`}
      >
        {roleLabel}
      </button>

      {open && (
        <div className={`absolute right-0 z-50 mt-2 w-64 rounded-xl border p-4 shadow-2xl ${theme.popover}`} role="dialog" aria-label="Account details">
          <p className={`text-[10px] font-black uppercase tracking-widest font-mono ${theme.roleText}`}>{roleLabel}</p>
          <p className="mt-1 truncate text-sm font-bold text-white" title={email}>{email}</p>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition active:scale-95 cursor-pointer ${theme.logout}`}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
