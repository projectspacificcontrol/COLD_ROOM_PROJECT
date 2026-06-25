import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  FileClock,
  Gauge,
  ListChecks,
  Settings,
  Shield,
  Siren,
  Users,
  Wifi,
  Loader2,
  CheckCircle2,
  Clock,
  Warehouse,
  Cpu,
  Server,
  Database,
  FileText
} from "lucide-react";
import { adminApi } from "../api/adminClient";
import { UserBadge } from "../components/shared/UserBadge";
import type { AdminAlert, AdminRoom, AuditLog, CurrentUser, SensorFault, SystemSetting, ThresholdRule, UserRecord } from "../types/admin";

type AdminRoute =
  | "/admin"
  | "/admin/users"
  | "/admin/thresholds"
  | "/admin/reports"
  | "/admin/alerts"
  | "/admin/system-health"
  | "/admin/audit-logs"
  | "/admin/settings";

type Toast = { kind: "success" | "error"; message: string };

const routes: Array<{ path: AdminRoute; label: string; icon: typeof Gauge }> = [
  { path: "/admin", label: "Dashboard", icon: Gauge },
  { path: "/admin/users", label: "Dashboard Access", icon: Users },
  { path: "/admin/thresholds", label: "Thresholds", icon: ListChecks },
  { path: "/admin/reports", label: "Reports", icon: Download },
  { path: "/admin/alerts", label: "Alerts", icon: Siren },
  { path: "/admin/system-health", label: "System Health", icon: Activity },
  { path: "/admin/audit-logs", label: "Audit Logs", icon: FileClock },
  { path: "/admin/settings", label: "Settings", icon: Settings }
];

function currentPath(): string {
  return window.location.pathname;
}

function isAdminRoute(path: string): path is AdminRoute {
  return routes.some((route) => route.path === path);
}

export function AdminApp() {
  const [path, setPath] = useState(currentPath());
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((kind: Toast["kind"], message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (path === "/admin/login") {
      setChecking(false);
      return;
    }
    adminApi
      .me()
      .then(setUser)
      .catch(() => navigate("/admin/login"))
      .finally(() => setChecking(false));
  }, [path, navigate]);

  if (checking) {
    return <AdminShellLoading />;
  }

  if (path === "/admin/login") {
    return <AdminLogin onLogin={(nextUser) => { setUser(nextUser); navigate("/admin"); }} toast={showToast} />;
  }

  if (!user) {
    return <AdminShellLoading />;
  }

  const safePath: AdminRoute = isAdminRoute(path) ? path : "/admin";

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-100">
      {/* Sidebar Shell */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-[#0d1420] p-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300 font-mono">SENSORCLOUD</p>
            <h1 className="text-lg font-black tracking-tight text-white">Admin Console</h1>
          </div>
        </div>
        <nav className="space-y-1.5">
          {routes.map((route) => {
            const Icon = route.icon;
            const active = route.path === safePath;
            return (
              <button
                key={route.path}
                onClick={() => navigate(route.path)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-slate-100 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                }`}
                type="button"
              >
                <Icon className={`h-5 w-5 transition-colors ${active ? "text-slate-950" : "text-slate-400"}`} />
                {route.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0a0f18]/90 px-5 py-4 backdrop-blur-md lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">SECURE CONSOLE</p>
            <h2 className="text-xl font-bold text-white tracking-tight">{routes.find((route) => route.path === safePath)?.label}</h2>
          </div>
          <div className="flex items-center gap-4">
            <UserBadge
              email={user.email}
              role={user.role}
              accent="sky"
              onLogout={async () => {
                await adminApi.logout();
                setUser(null);
                navigate("/admin/login");
              }}
            />
          </div>
        </header>

        {/* Content Container */}
        <div className="space-y-6 p-5 lg:p-8">
          <MobileNav path={safePath} navigate={navigate} />
          {safePath === "/admin" && <AdminDashboard toast={showToast} />}
          {safePath === "/admin/users" && <UsersPage toast={showToast} />}
          {safePath === "/admin/thresholds" && <ThresholdsPage toast={showToast} />}
          {safePath === "/admin/reports" && <ReportsPage toast={showToast} />}
          {safePath === "/admin/alerts" && <AlertsPage />}
          {safePath === "/admin/system-health" && <SystemHealthPage />}
          {safePath === "/admin/audit-logs" && <AuditLogsPage />}
          {safePath === "/admin/settings" && <SettingsPage toast={showToast} />}
        </div>
      </main>

      {/* Styled toast notifications */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl animate-bounce ${
          toast.kind === "success" 
            ? "bg-[#0d1420]/90 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10" 
            : "bg-[#0d1420]/90 border-rose-500/30 text-rose-400 shadow-rose-500/10"
        }`}>
          <div className={`rounded-lg p-1.5 ${toast.kind === "success" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            {toast.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <span className="text-sm font-semibold text-zinc-200">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function AdminShellLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0f18] text-sm text-zinc-300 font-semibold">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <span>Synchronizing secure console session...</span>
      </div>
    </main>
  );
}

function MobileNav({ path, navigate }: { path: AdminRoute; navigate: (path: string) => void }) {
  return (
    <div className="relative lg:hidden mb-4">
      <select 
        className="w-full rounded-lg border border-slate-800 bg-[#0d1420] p-3 text-sm font-semibold text-white select-premium focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer" 
        value={path} 
        onChange={(event) => navigate(event.target.value as AdminRoute)}
      >
        {routes.map((route) => <option key={route.path} value={route.path} className="bg-[#0d1420] text-white">{route.label}</option>)}
      </select>
    </div>
  );
}

function AdminLogin({ onLogin, toast }: { onLogin: (user: CurrentUser) => void; toast: (kind: Toast["kind"], message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0f18] p-4 text-white">
      <div className="relative w-full max-w-md space-y-6 overflow-hidden rounded-lg border border-slate-800 bg-[#0d1420] p-8 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-sky-500"></div>
        
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
            <Shield className="h-6 w-6 text-sky-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300 font-mono">SECURE ACCESS</p>
          <h1 className="mt-1.5 text-2xl font-black text-white tracking-tight">SensorCloud Console</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">Please sign in to configure storage settings</p>
        </div>
        
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!email || password.length < 8) {
              toast("error", "Enter a valid email and 8+ character password.");
              return;
            }
            setLoading(true);
            try {
              await adminApi.login(email, password);
              onLogin(await adminApi.me());
              toast("success", "Signed in securely.");
            } catch (error) {
              const message = (error as Error).message;
              if (message === "UNAUTHENTICATED") {
                toast("error", "Invalid email or password.");
              } else if (message === "FORBIDDEN") {
                toast("error", "Security check failed. Please refresh and try again.");
              } else if (/too many|locked|attempt/i.test(message)) {
                toast("error", message);
              } else {
                toast("error", "Login failed.");
              }
            } finally {
              setLoading(false);
            }
          }}
        >
          <LabeledInput label="Email Address" value={email} onChange={setEmail} type="email" placeholder="admin@sensorcloud.com" />
          <LabeledInput label="Console Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          
          <button 
            disabled={loading} 
            className="w-full rounded-xl btn-primary py-3.5 text-sm font-bold text-white transition disabled:opacity-60 cursor-pointer disabled:pointer-events-none mt-2 flex items-center justify-center gap-2" 
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Authenticating session...</span>
              </>
            ) : (
              "Sign In Securely"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function LabeledInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-zinc-400 tracking-wide">{label}</span>
      <input 
        className="w-full input-premium text-white focus:border-sky-500" 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        type={type} 
        placeholder={placeholder} 
      />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
        checked ? "bg-sky-500" : "bg-slate-800"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#0d1420] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          {title}
        </h3>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text, icon: Icon = FileText }: { text: string; icon?: typeof FileText }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 px-4 py-12 text-center shadow-sm">
      <div className="mb-4 rounded-lg border border-slate-800 bg-[#0d1420] p-4">
        <Icon className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-400 max-w-sm leading-relaxed">{text}</p>
    </div>
  );
}

function AdminDashboard({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminApi.overview>> | null>(null);
  const [connection, setConnection] = useState<"live" | "reconnecting" | "offline">("reconnecting");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await adminApi.overview();
        if (!cancelled) {
          setOverview(data);
          setConnection("live");
        }
      } catch {
        if (!cancelled) setConnection("offline");
      }
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!overview) return <EmptyState text="Loading admin dashboard telemetry..." icon={Loader2} />;

  const statCards = [
    {
      label: "Last Telemetry Sync",
      value: overview.last_successful_fetch_at ? new Date(overview.last_successful_fetch_at).toLocaleTimeString() : "Never",
      subtext: overview.last_successful_fetch_at ? new Date(overview.last_successful_fetch_at).toLocaleDateString() : "No sync record",
      icon: Clock,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20"
    },
    {
      label: "Rooms Online",
      value: overview.rooms_online,
      subtext: "Operational nodes",
      icon: Warehouse,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      label: "Rooms Offline",
      value: overview.rooms_offline,
      subtext: "Needs maintenance",
      icon: Warehouse,
      color: overview.rooms_offline > 0 ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
    },
    {
      label: "Active Alerts",
      value: overview.active_alerts,
      subtext: "Emergency events",
      icon: Siren,
      color: overview.active_alerts > 0 ? "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse" : "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
    },
    {
      label: "Sensor Faults",
      value: overview.sensor_faults,
      subtext: "Hardware exceptions",
      icon: Cpu,
      color: overview.sensor_faults > 0 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
    },
    {
      label: "API Gateway",
      value: overview.api_source_health,
      subtext: "DataSource health",
      icon: Server,
      color: overview.api_source_health === "healthy" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      label: "Database Node",
      value: overview.database_health,
      subtext: "Storage consistency",
      icon: Database,
      color: overview.database_health === "healthy" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20"
    },
    {
      label: "Live Telemetry stream",
      value: connection.toUpperCase(),
      subtext: connection === "live" ? "Realtime SSE" : "Re-establishing",
      icon: Wifi,
      color: connection === "live" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Live connection state banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#1f2937] bg-[#0d1420]/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`absolute -inset-0.5 rounded-full blur-sm opacity-75 ${connection === "live" ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div className={`relative h-2.5 w-2.5 rounded-full ${connection === "live" ? "bg-emerald-400" : "bg-amber-400"} ${connection === "live" ? "ingestion-active-pulse" : ""}`} />
          </div>
          <p className="text-xs font-semibold text-zinc-300">
            Telemetry Connection Status: <span className="font-bold text-white uppercase">{connection}</span>
          </p>
        </div>
        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">ENCRYPTED SSE KEEPALIVE</span>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div className="group rounded-2xl border border-[#1f2937] bg-[#0d1420]/70 p-5 shadow-lg hover:border-sky-500/35 transition-all duration-300 hover:-translate-y-1 glass-card-hover" key={idx}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold text-zinc-400 leading-none">{card.label}</span>
                <div className={`rounded-xl border p-2 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white tracking-tight">{card.value}</span>
                <span className="text-xs font-semibold text-zinc-500 mt-1">{card.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="Recent Admin Actions">
        <AuditTable rows={overview.recent_admin_actions} />
      </Panel>
    </div>
  );
}

function UsersPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [rows, setRows] = useState<UserRecord[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const load = useCallback(() => adminApi.users().then(setRows), []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (row: UserRecord) => {
    const grant = !row.is_active;
    if (!confirm(`${grant ? "Grant" : "Revoke"} dashboard access for ${row.email}?`)) return;
    await adminApi.updateUser(row.id, { is_active: grant });
    toast("success", grant ? "Access granted — the user can sign in." : "Access revoked — the user can no longer sign in.");
    load();
  };

  const resetPassword = async (row: UserRecord) => {
    const next = prompt(`Set a new password for ${row.email} (min. 8 characters):`);
    if (next === null) return;
    if (next.length < 8) {
      toast("error", "Password must be at least 8 characters.");
      return;
    }
    await adminApi.updateUser(row.id, { password: next });
    toast("success", "Password updated. Share it with the user securely.");
  };

  return (
    <Panel title="Dashboard Access — User Accounts">
      <p className="mb-5 -mt-2 text-sm font-medium leading-relaxed text-slate-400">
        Only the accounts listed here can sign in to the dashboard. Create an account with an email and password to
        grant access, deactivate it to revoke access instantly, or reset a password at any time. Access is controlled
        entirely from this page — there are no IP-based rules.
      </p>
      <form
        className="mb-6 grid gap-4 md:grid-cols-4 items-end bg-[#0d1420]/30 p-5 rounded-2xl border border-[#1f2937]/50"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!email || !password) {
            toast("error", "Please fill in all user credentials.");
            return;
          }
          if (password.length < 8) {
            toast("error", "Password must be at least 8 characters.");
            return;
          }
          await adminApi.createUser({ email, password, role, is_active: true });
          toast("success", "Account created — the user can now sign in to the dashboard.");
          setEmail("");
          setPassword("");
          load();
        }}
      >
        <LabeledInput label="Email Address" value={email} onChange={setEmail} type="email" placeholder="user@company.com" />
        <LabeledInput label="Initial Password" value={password} onChange={setPassword} type="password" placeholder="Min. 8 chars" />
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-400 tracking-wide">Privilege Role</span>
          <select
            className="w-full input-premium select-premium text-white focus:border-sky-500 cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option className="bg-[#0d1420]">viewer</option>
            <option className="bg-[#0d1420]">operator</option>
            <option className="bg-[#0d1420]">admin</option>
          </select>
        </label>
        <button className="w-full rounded-xl btn-primary py-3 text-sm font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5" type="submit">
          <Users className="h-4 w-4" />
          Grant Access
        </button>
      </form>

      <DataTable
        headers={["User Principal", "Role Authorization", "Access Status", "Date Created", "Administrative Options"]}
        rows={rows.map((row) => {
          const roleBadge = (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
              row.role === "admin"
                ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                : row.role === "operator"
                ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                : "bg-zinc-800 border-zinc-705 text-zinc-400"
            }`}>
              {row.role}
            </span>
          );

          const statusBadge = (
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold ${row.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${row.is_active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              {row.is_active ? "CAN SIGN IN" : "REVOKED"}
            </span>
          );

          const createdCell = (
            <span className="text-zinc-400 font-semibold">{new Date(row.created_at).toLocaleString()}</span>
          );

          return [
            <span className="font-semibold text-white">{row.email}</span>,
            roleBadge,
            statusBadge,
            createdCell,
            <div className="flex flex-wrap items-center gap-4">
              <button
                className={`font-bold text-xs hover:underline cursor-pointer ${row.is_active ? "text-amber-400" : "text-emerald-400"}`}
                onClick={() => toggleActive(row)}
              >
                {row.is_active ? "Revoke Access" : "Grant Access"}
              </button>
              <button
                className="text-sky-400 hover:text-sky-300 hover:underline transition font-bold text-xs cursor-pointer"
                onClick={() => resetPassword(row)}
              >
                Reset Password
              </button>
              <button
                className="text-rose-450 hover:text-rose-400 hover:underline transition font-bold text-xs cursor-pointer"
                onClick={async () => {
                  if (confirm(`Delete account for user ${row.email}?`)) {
                    await adminApi.deleteUser(row.id);
                    toast("success", "User account deleted successfully.");
                    load();
                  }
                }}
              >
                Delete
              </button>
            </div>
          ];
        })}
      />
    </Panel>
  );
}

function ThresholdsPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [rows, setRows] = useState<ThresholdRule[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [form, setForm] = useState({ scope_type: "global", scope_id: "", scope_key: "", warning_max_c: "5.5", critical_max_c: "7", stale_after_seconds: "900", is_active: true });
  const load = useCallback(async () => { setRows(await adminApi.thresholds()); setRooms(await adminApi.rooms()); }, []);
  useEffect(() => { load(); }, [load]);
  const effective = useMemo(() => rows.find((row) => row.scope_type === "global"), [rows]);

  return (
    <Panel 
      title="Telemetry Alarm Thresholds"
      actions={
        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 font-mono">
          ACTIVE SEED ROOMS: {rooms.length}
        </span>
      }
    >
      <form 
        className="mb-5 grid gap-4 md:grid-cols-6 items-end bg-[#0d1420]/30 p-5 rounded-2xl border border-[#1f2937]/50" 
        onSubmit={async (event) => { 
          event.preventDefault(); 
          await adminApi.upsertThreshold({ 
            scope_type: form.scope_type, 
            scope_id: form.scope_id ? Number(form.scope_id) : null, 
            scope_key: form.scope_key || null, 
            warning_max_c: Number(form.warning_max_c), 
            critical_max_c: Number(form.critical_max_c), 
            stale_after_seconds: Number(form.stale_after_seconds), 
            is_active: form.is_active 
          }); 
          toast("success", "Threshold rule saved successfully."); 
          load(); 
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-400 tracking-wide">Target Scope</span>
          <select 
            className="w-full input-premium select-premium text-white focus:border-sky-500 cursor-pointer" 
            value={form.scope_type} 
            onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_id: "", scope_key: "" })}
          >
            <option className="bg-[#0d1420]">global</option>
            <option className="bg-[#0d1420]">group</option>
            <option className="bg-[#0d1420]">room</option>
            <option className="bg-[#0d1420]">sensor</option>
          </select>
        </label>
        <LabeledInput 
          label={form.scope_type === "group" ? "Group Code Identifier" : "Scope Target ID"} 
          value={form.scope_type === "group" ? form.scope_key : form.scope_id} 
          onChange={(value) => form.scope_type === "group" ? setForm({ ...form, scope_key: value }) : setForm({ ...form, scope_id: value })} 
          placeholder={form.scope_type === "global" ? "Active for all" : "e.g. 101"}
        />
        <LabeledInput label="Warning Threshold (°C)" value={form.warning_max_c} onChange={(warning_max_c) => setForm({ ...form, warning_max_c })} />
        <LabeledInput label="Critical Threshold (°C)" value={form.critical_max_c} onChange={(critical_max_c) => setForm({ ...form, critical_max_c })} />
        <LabeledInput label="Telemetry Stale Limit (s)" value={form.stale_after_seconds} onChange={(stale_after_seconds) => setForm({ ...form, stale_after_seconds })} />
        
        <button className="w-full rounded-xl btn-primary py-3 text-sm font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5" type="submit">
          <ListChecks className="h-4 w-4" />
          Save Rule
        </button>
      </form>

      {effective && (
        <div className="mb-6 p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-405" />
            <span className="text-xs font-semibold text-zinc-300">
              Global Policy: <strong className="text-white">Warning limit at {effective.warning_max_c}°C, Critical limit at {effective.critical_max_c}°C, Telemetry stale after {effective.stale_after_seconds}s.</strong>
            </span>
          </div>
        </div>
      )}

      <DataTable 
        headers={["Target Scope", "Target Identifier", "Warning Temp", "Critical Temp", "Stale limit", "Status", "Actions"]} 
        rows={rows.map((row) => {
          const scopeTypeBadge = (
            <span className="font-bold text-xs uppercase text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">
              {row.scope_type}
            </span>
          );

          const statusBadge = (
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold ${row.is_active ? "text-emerald-400" : "text-zinc-550"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${row.is_active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              {row.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
          );

          return [
            scopeTypeBadge,
            <span className="font-semibold font-mono text-white text-sm">{row.scope_key ?? row.scope_id ?? "All Sensors"}</span>,
            <span className="font-bold text-amber-400 text-sm">{row.warning_max_c ?? "—"}°C</span>,
            <span className="font-bold text-rose-450 text-sm">{row.critical_max_c ?? "—"}°C</span>,
            <span className="font-semibold text-zinc-300 text-xs font-mono">{row.stale_after_seconds}s</span>,
            statusBadge,
            <button 
              className="text-rose-455 hover:text-rose-400 hover:underline transition font-bold text-xs cursor-pointer" 
              onClick={async () => { 
                if (confirm("Delete this threshold configuration rule?")) { 
                  await adminApi.deleteThreshold(row.id); 
                  toast("success", "Threshold configuration rule deleted."); 
                  load(); 
                } 
              }}
            >
              Delete Rule
            </button>
          ];
        })} 
      />
    </Panel>
  );
}

function ReportsPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [duration, setDuration] = useState("24h");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [availableRooms, setAvailableRooms] = useState<AdminRoom[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeFaults, setIncludeFaults] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .rooms()
      .then((rooms) => {
        if (!cancelled) setAvailableRooms(rooms);
      })
      .catch(() => toast("error", "Unable to load report room filters."))
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const groupCodes = useMemo(
    () => Array.from(new Set(availableRooms.map((room) => room.group_code))).sort(),
    [availableRooms]
  );

  const visibleRooms = useMemo(() => {
    const rooms = selectedGroups.length
      ? availableRooms.filter((room) => selectedGroups.includes(room.group_code))
      : availableRooms;
    return [...rooms].sort((a, b) => a.room_number - b.room_number);
  }, [availableRooms, selectedGroups]);

  useEffect(() => {
    if (selectedGroups.length === 0) return;
    setSelectedRooms((current) => {
      const allowed = new Set(visibleRooms.map((room) => room.room_number));
      const next = current.filter((roomNumber) => allowed.has(roomNumber));
      return next.length === current.length ? current : next;
    });
  }, [selectedGroups, visibleRooms]);

  const toggleGroup = (groupCode: string) => {
    setSelectedGroups((current) =>
      current.includes(groupCode)
        ? current.filter((value) => value !== groupCode)
        : [...current, groupCode].sort()
    );
  };

  const toggleRoom = (roomNumber: number) => {
    setSelectedRooms((current) =>
      current.includes(roomNumber)
        ? current.filter((value) => value !== roomNumber)
        : [...current, roomNumber].sort((a, b) => a - b)
    );
  };

  const selectedFilterText = selectedRooms.length
    ? `${selectedRooms.length} selected room${selectedRooms.length === 1 ? "" : "s"}`
    : selectedGroups.length
      ? `${selectedGroups.length} selected group${selectedGroups.length === 1 ? "" : "s"}`
      : "All rooms and groups";

  return (
    <Panel title="Temperature Reports">
      <div className="mb-5 grid gap-4 rounded-lg border border-slate-800 bg-slate-950/30 p-5 md:grid-cols-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 tracking-wide">Reporting Period</span>
          <select 
            className="w-full input-premium select-premium text-white focus:border-sky-500 cursor-pointer" 
            value={duration} 
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="1h" className="bg-[#0d1420]">Last 1 hour</option>
            <option value="8h" className="bg-[#0d1420]">Last 8 hours</option>
            <option value="24h" className="bg-[#0d1420]">Last 24 hours</option>
            <option value="7d" className="bg-[#0d1420]">Last 7 days</option>
            <option value="30d" className="bg-[#0d1420]">Last 30 days</option>
            <option value="custom" className="bg-[#0d1420]">Custom Date Range</option>
          </select>
        </label>
        {duration === "custom" && (
          <>
            <LabeledInput label="Start Date" value={from} onChange={setFrom} type="datetime-local" />
            <LabeledInput label="End Date" value={to} onChange={setTo} type="datetime-local" />
          </>
        )}
      </div>

      <div className="mb-5 rounded-lg border border-slate-800 bg-slate-950/20 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white">Group Filters</h4>
            <p className="text-xs text-slate-400">Choose one or more CR groups, or leave all groups selected.</p>
          </div>
          <button
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
            onClick={() => {
              setSelectedGroups([]);
              setSelectedRooms([]);
            }}
            type="button"
          >
            All Groups
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {loadingRooms && <span className="text-sm text-slate-400">Loading groups...</span>}
          {!loadingRooms && groupCodes.map((groupCode) => {
            const active = selectedGroups.includes(groupCode);
            return (
              <button
                key={groupCode}
                type="button"
                onClick={() => toggleGroup(groupCode)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                  active
                    ? "border-sky-400 bg-sky-500/15 text-sky-200"
                    : "border-slate-700 bg-[#0a0f18] text-slate-300 hover:border-slate-500"
                }`}
              >
                {groupCode}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-slate-800 bg-slate-950/20 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white">Room Selection</h4>
            <p className="text-xs text-slate-400">Select rooms for a focused report. Leave blank to export all rooms in the selected group filter.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
              onClick={() => setSelectedRooms(visibleRooms.map((room) => room.room_number))}
              type="button"
            >
              Select Visible
            </button>
            <button
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
              onClick={() => setSelectedRooms([])}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="grid max-h-64 gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loadingRooms && <span className="text-sm text-slate-400">Loading rooms...</span>}
          {!loadingRooms && visibleRooms.length === 0 && <span className="text-sm text-slate-400">No rooms found for this filter.</span>}
          {!loadingRooms && visibleRooms.map((room) => {
            const active = selectedRooms.includes(room.room_number);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => toggleRoom(room.room_number)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                    : "border-slate-700 bg-[#0a0f18] text-slate-300 hover:border-slate-500"
                }`}
              >
                <span className="text-sm font-bold">Room {room.room_number}</span>
                <span className="text-[11px] font-semibold text-slate-400">{room.group_code}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/30 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm font-semibold text-zinc-300 cursor-pointer hover:text-white select-none">
            <Toggle checked={includeAlerts} onChange={setIncludeAlerts} /> 
            Include alerts
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-zinc-300 cursor-pointer hover:text-white select-none">
            <Toggle checked={includeFaults} onChange={setIncludeFaults} /> 
            Include sensor faults
          </label>
          <span className="rounded-lg border border-slate-800 bg-[#0a0f18] px-3 py-2 text-xs font-semibold text-slate-400">
            Export scope: <span className="text-slate-200">{selectedFilterText}</span>
          </span>
        </div>

        <button 
          disabled={generating}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-60" 
          onClick={async () => { 
            if (duration === "custom" && (!from || !to)) {
              toast("error", "Select both start and end date before exporting.");
              return;
            }
            setGenerating(true);
            try {
              const params = new URLSearchParams({ 
                format: "xlsx", 
                include_alerts: String(includeAlerts), 
                include_faults: String(includeFaults) 
              }); 
              if (duration === "custom") { 
                params.set("from", from); 
                params.set("to", to); 
              } else {
                params.set("duration", duration); 
              }
              if (selectedRooms.length) {
                params.set("rooms", selectedRooms.join(",")); 
              } else if (selectedGroups.length) {
                params.set("groups", selectedGroups.join(",")); 
              }
              
              const blob = await adminApi.downloadReport(params); 
              const url = URL.createObjectURL(blob); 
              const link = document.createElement("a"); 
              link.href = url; 
              link.download = `cold-storage-compliance-report-${duration}.xlsx`; 
              link.click(); 
              URL.revokeObjectURL(url); 
              toast("success", "Compliance spreadsheet generated successfully."); 
            } catch {
              toast("error", "Failed to generate Excel report.");
            } finally {
              setGenerating(false);
            }
          }} 
          type="button"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Excel Spreadsheet</span>
            </>
          )}
        </button>
      </div>
    </Panel>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [faults, setFaults] = useState<SensorFault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    Promise.all([adminApi.alerts(), adminApi.sensorFaults()])
      .then(([a, f]) => {
        setAlerts(a);
        setFaults(f);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <EmptyState text="Retrieving diagnostic exception reports..." icon={Loader2} />;

  return (
    <div className="space-y-6">
      <Panel title="Active System Incidents">
        <DataTable 
          headers={["Event Severity", "Event State", "Description Message", "Time Triggered"]} 
          rows={alerts.map((a) => {
            const isCritical = a.severity === "critical";
            const isWarning = a.severity === "warning";
            
            const severityBadge = (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold font-mono border ${
                isCritical 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                  : isWarning 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? "bg-rose-450 animate-pulse" : isWarning ? "bg-amber-405" : "bg-blue-405"}`} />
                {a.severity.toUpperCase()}
              </span>
            );

            const statusBadge = (
              <span className={`font-semibold text-xs px-2 py-0.5 rounded-md ${a.status === "active" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-zinc-800 text-zinc-400"}`}>
                {a.status.toUpperCase()}
              </span>
            );

            return [
              severityBadge,
              statusBadge,
              <span className="font-semibold text-white">{a.message}</span>,
              <span className="text-zinc-400 font-semibold">{new Date(a.opened_at).toLocaleString()}</span>
            ];
          })} 
        />
      </Panel>

      <Panel title="Telemetry Sensor Hardware Faults">
        <DataTable 
          headers={["Hardware Sensor", "Exception Type", "Status Status", "Diagnostic Details", "Last Observed"]} 
          rows={faults.map((f) => {
            const statusBadge = (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold ${f.status === "active" ? "text-rose-400" : "text-zinc-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${f.status === "active" ? "bg-rose-400 animate-pulse" : "bg-zinc-600"}`} />
                {f.status.toUpperCase()}
              </span>
            );

            return [
              <span className="font-mono font-bold text-white text-xs">{f.source_tag}</span>,
              <span className="font-semibold text-zinc-300 font-mono text-xs">{f.fault_type}</span>,
              statusBadge,
              <span className="text-zinc-300 font-semibold">{f.message}</span>,
              <span className="text-zinc-400 font-semibold">{new Date(f.last_seen_at).toLocaleString()}</span>
            ];
          })} 
        />
      </Panel>
    </div>
  );
}

function SystemHealthPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    adminApi.health()
      .then(setRows)
      .finally(() => setLoading(false)); 
  }, []);

  if (loading) return <EmptyState text="Checking health states..." icon={Loader2} />;

  return (
    <Panel title="Database & SSE Connection Pipeline Ingestion Health">
      <DataTable 
        headers={["Data Pipeline Source", "Last Successful Sync", "Last Connection Error", "Ingested Rows Count"]} 
        rows={rows.map((r) => {
          const hasError = !!r.last_error;
          const sourceStr = String(r.source ?? "");

          const sourceCell = (
            <span className="font-bold text-white flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${hasError ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
              {sourceStr}
            </span>
          );

          const lastSuccess = r.last_successful_fetch_at || r.last_success_at;
          const successCell = lastSuccess ? (
            <span className="text-zinc-300 font-semibold">{new Date(String(lastSuccess)).toLocaleString()}</span>
          ) : (
            <span className="text-zinc-500 font-mono">Never</span>
          );

          const errorCell = hasError ? (
            <span className="text-rose-400 font-semibold text-xs font-mono bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 inline-block max-w-[280px] truncate" title={String(r.last_error)}>
              {String(r.last_error)}
            </span>
          ) : (
            <span className="text-emerald-450 font-semibold text-xs">Healthy (No errors)</span>
          );

          return [
            sourceCell,
            successCell,
            errorCell,
            <span className="font-mono font-semibold text-white bg-zinc-800 px-2.5 py-0.5 rounded-md">{String(r.rows_ingested ?? 0)}</span>
          ];
        })} 
      />
    </Panel>
  );
}

function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    adminApi.auditLogs()
      .then(setRows)
      .finally(() => setLoading(false)); 
  }, []);

  if (loading) return <EmptyState text="Retrieving session audit trails..." icon={Loader2} />;

  return (
    <Panel title="Platform Command Security Audit Trail">
      <AuditTable rows={rows} />
    </Panel>
  );
}

function SettingsPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [rows, setRows] = useState<SystemSetting[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => adminApi.settings().then(setRows).finally(() => setLoading(false)), []);
  useEffect(() => { load(); }, [load]);

  return (
    <Panel title="Global Dashboard Settings & Variables">
      <form 
        className="mb-6 grid gap-4 md:grid-cols-4 items-end bg-[#0d1420]/30 p-5 rounded-2xl border border-[#1f2937]/50" 
        onSubmit={async (event) => { 
          event.preventDefault(); 
          if (!key || !value) {
            toast("error", "Key and Value parameters are mandatory.");
            return;
          }
          await adminApi.saveSetting(key, { value, is_secret: isSecret }); 
          toast("success", "System configuration setting updated."); 
          setKey(""); 
          setValue(""); 
          load(); 
        }}
      >
        <LabeledInput label="Configuration Key" value={key} onChange={setKey} placeholder="e.g. TELEMETRY_TIMEOUT" />
        <LabeledInput label="Variable Value" value={value} onChange={setValue} placeholder="e.g. 5000" />
        <label className="flex items-center gap-3 pb-3 text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer select-none">
          <Toggle checked={isSecret} onChange={setIsSecret} /> 
          Is Sensitive / Secret Value
        </label>
        <button className="w-full rounded-xl btn-primary py-3 text-sm font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5" type="submit">
          <Settings className="h-4 w-4" />
          Save Variable
        </button>
      </form>

      {loading ? (
        <EmptyState text="Synchronizing environment properties..." icon={Loader2} />
      ) : (
        <DataTable 
          headers={["Configuration Key", "Assigned Value", "Is Sensitive Token", "Last Modified"]} 
          rows={rows.map((r) => {
            const secretBadge = (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-bold ${r.is_secret ? "text-sky-400" : "text-zinc-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${r.is_secret ? "bg-sky-400 animate-pulse" : "bg-zinc-600"}`} />
                {r.is_secret ? "SECRET" : "PUBLIC"}
              </span>
            );

            const valueCell = r.is_secret ? (
              <span className="font-mono text-zinc-500 text-xs italic tracking-wider">••••••••••••••••</span>
            ) : (
              <span className="font-mono text-white text-sm font-semibold">{String(r.value)}</span>
            );

            return [
              <span className="font-mono font-bold text-sky-400 text-xs">{r.key}</span>,
              valueCell,
              secretBadge,
              <span className="text-zinc-400 font-semibold">{new Date(r.updated_at).toLocaleString()}</span>
            ];
          })} 
        />
      )}
    </Panel>
  );
}

function AuditTable({ rows }: { rows: AuditLog[] | Array<Record<string, unknown>> }) {
  return (
    <DataTable 
      headers={["Action", "Resource Target", "Actor", "Origin IP", "Timestamp"]} 
      rows={rows.map((row) => {
        const action = String(row.action ?? "");
        const isSuccess = action.includes("success") || action.includes("save") || action.includes("create");
        const isDanger = action.includes("delete") || action.includes("fail") || action.includes("remove");
        
        const actionBadge = (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold font-mono border ${
            isSuccess 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : isDanger 
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
              : "bg-sky-500/10 border-sky-500/20 text-sky-400"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isSuccess ? "bg-emerald-400" : isDanger ? "bg-rose-400" : "bg-sky-400"}`} />
            {action}
          </span>
        );

        const resourceStr = `${String(row.resource_type ?? "")} ${row.resource_id ? `#${String(row.resource_id)}` : ""}`;
        const resourceCell = (
          <span className="font-semibold text-white tracking-tight">{resourceStr}</span>
        );

        const actorStr = String(row.actor_user_id ?? "system");
        const actorCell = (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${actorStr === "system" ? "bg-zinc-800 text-zinc-400" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
            {actorStr === "system" ? "SYSTEM" : `USER #${actorStr}`}
          </span>
        );

        const ipCell = row.ip_address ? (
          <span className="font-mono text-zinc-400 text-xs">{String(row.ip_address)}</span>
        ) : (
          <span className="text-zinc-500 font-mono">—</span>
        );

        const timeStr = row.created_at ? new Date(String(row.created_at)).toLocaleString() : "";
        const timeCell = (
          <span className="text-zinc-400 font-semibold">{timeStr}</span>
        );

        return [actionBadge, resourceCell, actorCell, ipCell, timeCell];
      })} 
    />
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  if (rows.length === 0) return <EmptyState text="No records found." icon={FileText} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#0a0f18]/30">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#1f2937] bg-[#0d1420]/50 text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            {headers.map((header) => <th className="px-4 py-3.5" key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1f2937]/50">
          {rows.map((row, index) => (
            <tr className="hover:bg-white/[0.02] text-zinc-350 transition-colors" key={index}>
              {row.map((cell, cellIndex) => (
                <td className="px-4 py-4 align-middle text-zinc-300 font-medium" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
