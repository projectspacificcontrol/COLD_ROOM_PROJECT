import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  FileClock,
  Gauge,
  ListChecks,
  LogOut,
  Network,
  Settings,
  Shield,
  Siren,
  Users,
  Wifi
} from "lucide-react";
import { adminApi } from "../api/adminClient";
import type { AdminAlert, AdminRoom, AuditLog, CurrentUser, IpAllowlistEntry, SensorFault, SystemSetting, ThresholdRule, UserRecord } from "../types/admin";

type AdminRoute =
  | "/admin"
  | "/admin/users"
  | "/admin/ip-allowlist"
  | "/admin/thresholds"
  | "/admin/reports"
  | "/admin/alerts"
  | "/admin/system-health"
  | "/admin/audit-logs"
  | "/admin/settings";

type Toast = { kind: "success" | "error"; message: string };

const routes: Array<{ path: AdminRoute; label: string; icon: typeof Gauge }> = [
  { path: "/admin", label: "Dashboard", icon: Gauge },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/ip-allowlist", label: "IP Allowlist", icon: Network },
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
    <div className="min-h-screen bg-[#0b1117] text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#263442] bg-[#111A22] p-4 lg:block">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cold Room</p>
          <h1 className="text-xl font-black">Admin Panel</h1>
        </div>
        <nav className="space-y-1">
          {routes.map((route) => {
            const Icon = route.icon;
            const active = route.path === safePath;
            return (
              <button
                key={route.path}
                onClick={() => navigate(route.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-black transition ${
                  active ? "bg-[#10B981] text-[#07110d]" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {route.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#263442] bg-[#0b1117]/95 px-4 py-3 backdrop-blur lg:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Secure Operations</p>
            <h2 className="text-lg font-black">{routes.find((route) => route.path === safePath)?.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-[#263442] px-3 py-1.5 text-xs font-bold text-zinc-200">{user.email} / {user.role}</span>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-black hover:bg-zinc-700"
              onClick={async () => {
                await adminApi.logout();
                setUser(null);
                navigate("/admin/login");
              }}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>
        <div className="space-y-5 p-4 lg:p-6">
          <MobileNav path={safePath} navigate={navigate} />
          {safePath === "/admin" && <AdminDashboard toast={showToast} />}
          {safePath === "/admin/users" && <UsersPage toast={showToast} />}
          {safePath === "/admin/ip-allowlist" && <IpAllowlistPage toast={showToast} />}
          {safePath === "/admin/thresholds" && <ThresholdsPage toast={showToast} />}
          {safePath === "/admin/reports" && <ReportsPage toast={showToast} />}
          {safePath === "/admin/alerts" && <AlertsPage />}
          {safePath === "/admin/system-health" && <SystemHealthPage />}
          {safePath === "/admin/audit-logs" && <AuditLogsPage />}
          {safePath === "/admin/settings" && <SettingsPage toast={showToast} />}
        </div>
      </main>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-black shadow-xl ${toast.kind === "success" ? "bg-[#10B981] text-[#07110d]" : "bg-rose-600 text-white"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function AdminShellLoading() {
  return <main className="grid min-h-screen place-items-center bg-[#0b1117] text-sm font-black text-white">Checking secure session...</main>;
}

function MobileNav({ path, navigate }: { path: AdminRoute; navigate: (path: string) => void }) {
  return (
    <select className="w-full rounded-lg border border-[#263442] bg-[#111A22] p-3 text-sm font-black text-white lg:hidden" value={path} onChange={(event) => navigate(event.target.value)}>
      {routes.map((route) => <option key={route.path} value={route.path}>{route.label}</option>)}
    </select>
  );
}

function AdminLogin({ onLogin, toast }: { onLogin: (user: CurrentUser) => void; toast: (kind: Toast["kind"], message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top_left,#152232,#0b1117_60%)] p-4 text-white">
      <form
        className="w-full max-w-md space-y-4 rounded-xl border border-[#263442] bg-[#111A22] p-6 shadow-xl"
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
            toast("error", (error as Error).message === "FORBIDDEN" ? "This IP is not allowed for admin access." : "Login failed.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Secure Admin</p>
          <h1 className="mt-1 text-2xl font-black">Cold Room Admin Login</h1>
        </div>
        <LabeledInput label="Email" value={email} onChange={setEmail} type="email" />
        <LabeledInput label="Password" value={password} onChange={setPassword} type="password" />
        <button disabled={loading} className="w-full rounded-lg bg-[#10B981] px-4 py-3 text-sm font-black text-[#07110d] disabled:opacity-60" type="submit">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}

function LabeledInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{label}</span>
      <input className="w-full rounded-lg border border-[#263442] bg-[#0b1117] px-3 py-2 text-sm text-white outline-none focus:border-[#10B981]" value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} />
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <input className="h-4 w-4 accent-[#10B981]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[#263442] bg-[#111A22] p-4"><h3 className="mb-4 text-base font-black">{title}</h3>{children}</section>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#263442] p-8 text-center text-sm font-semibold text-zinc-400">{text}</div>;
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

  if (!overview) return <EmptyState text="Loading admin dashboard..." />;
  const cards = [
    ["Last Fetch", overview.last_successful_fetch_at ? new Date(overview.last_successful_fetch_at).toLocaleString() : "Never"],
    ["Rooms Online", overview.rooms_online],
    ["Rooms Offline", overview.rooms_offline],
    ["Active Alerts", overview.active_alerts],
    ["Sensor Faults", overview.sensor_faults],
    ["API Source", overview.api_source_health],
    ["Database", overview.database_health],
    ["Live Updates", connection]
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg border border-[#263442] bg-[#111A22] px-3 py-2 text-xs font-black uppercase tracking-widest text-zinc-300">
        <Wifi className={`h-4 w-4 ${connection === "live" ? "text-[#10B981]" : "text-amber-400"}`} />
        Admin data connection: {connection}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => <div className="rounded-lg border border-[#263442] bg-[#111A22] p-4" key={String(label)}><p className="text-xs font-black uppercase text-zinc-500">{label}</p><p className="mt-2 text-xl font-black">{String(value)}</p></div>)}
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
  return (
    <Panel title="Users And Roles">
      <form className="mb-4 grid gap-3 md:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); await adminApi.createUser({ email, password, role, is_active: true }); toast("success", "User created."); setEmail(""); setPassword(""); load(); }}>
        <LabeledInput label="Email" value={email} onChange={setEmail} type="email" />
        <LabeledInput label="Password" value={password} onChange={setPassword} type="password" />
        <label className="block space-y-1"><span className="text-xs font-black uppercase tracking-widest text-zinc-400">Role</span><select className="w-full rounded-lg border border-[#263442] bg-[#0b1117] px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}><option>viewer</option><option>operator</option><option>admin</option></select></label>
        <button className="self-end rounded-lg bg-[#10B981] px-4 py-2 text-sm font-black text-[#07110d]" type="submit">Add User</button>
      </form>
      <DataTable headers={["Email", "Role", "Active", "Created", "Actions"]} rows={rows.map((row) => [row.email, row.role, row.is_active ? "Yes" : "No", new Date(row.created_at).toLocaleString(), <button className="text-rose-300" onClick={async () => { if (confirm("Delete this user?")) { await adminApi.deleteUser(row.id); toast("success", "User deleted."); load(); } }}>Delete</button>])} />
    </Panel>
  );
}

function IpAllowlistPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [rows, setRows] = useState<IpAllowlistEntry[]>([]);
  const [form, setForm] = useState({ cidr: "", label: "", description: "", scope: "dashboard_access", is_active: true });
  const load = useCallback(() => adminApi.ipAllowlist().then(setRows), []);
  useEffect(() => { load(); }, [load]);
  return (
    <Panel title="IP Allowlist">
      <form className="mb-4 grid gap-3 md:grid-cols-5" onSubmit={async (event) => { event.preventDefault(); await adminApi.createIp(form); toast("success", "Allowlist entry saved."); setForm({ cidr: "", label: "", description: "", scope: "dashboard_access", is_active: true }); load(); }}>
        <LabeledInput label="CIDR / IP" value={form.cidr} onChange={(cidr) => setForm({ ...form, cidr })} placeholder="192.168.1.0/24" />
        <LabeledInput label="Label" value={form.label} onChange={(label) => setForm({ ...form, label })} />
        <LabeledInput label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <label className="block space-y-1"><span className="text-xs font-black uppercase tracking-widest text-zinc-400">Scope</span><select className="w-full rounded-lg border border-[#263442] bg-[#0b1117] px-3 py-2 text-sm" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><option value="dashboard_access">dashboard_access</option><option value="admin_access">admin_access</option><option value="api_access">api_access</option></select></label>
        <button className="self-end rounded-lg bg-[#10B981] px-4 py-2 text-sm font-black text-[#07110d]" type="submit">Add Entry</button>
      </form>
      <DataTable headers={["CIDR", "Label", "Scope", "Enabled", "Created", "Last Matched", "Actions"]} rows={rows.map((row) => [row.cidr, row.label ?? "", row.scope, row.is_active ? "Yes" : "No", new Date(row.created_at).toLocaleString(), row.last_matched_at ? new Date(row.last_matched_at).toLocaleString() : "Never", <div className="flex gap-3"><button className="text-[#10B981]" onClick={async () => { await adminApi.updateIp(row.id, { ...row, is_active: !row.is_active }); toast("success", "Entry updated."); load(); }}>{row.is_active ? "Disable" : "Enable"}</button><button className="text-rose-300" onClick={async () => { if (confirm("Delete this allowlist entry?")) { await adminApi.deleteIp(row.id); toast("success", "Entry deleted."); load(); } }}>Delete</button></div>])} />
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
    <Panel title="Threshold Rules">
      <form className="mb-4 grid gap-3 md:grid-cols-6" onSubmit={async (event) => { event.preventDefault(); await adminApi.upsertThreshold({ scope_type: form.scope_type, scope_id: form.scope_id ? Number(form.scope_id) : null, scope_key: form.scope_key || null, warning_max_c: Number(form.warning_max_c), critical_max_c: Number(form.critical_max_c), stale_after_seconds: Number(form.stale_after_seconds), is_active: form.is_active }); toast("success", "Threshold saved."); load(); }}>
        <label className="block space-y-1"><span className="text-xs font-black uppercase tracking-widest text-zinc-400">Scope</span><select className="w-full rounded-lg border border-[#263442] bg-[#0b1117] px-3 py-2 text-sm" value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value, scope_id: "", scope_key: "" })}><option>global</option><option>group</option><option>room</option><option>sensor</option></select></label>
        <LabeledInput label={form.scope_type === "group" ? "Group Code" : "Scope ID"} value={form.scope_type === "group" ? form.scope_key : form.scope_id} onChange={(value) => form.scope_type === "group" ? setForm({ ...form, scope_key: value }) : setForm({ ...form, scope_id: value })} />
        <LabeledInput label="Warning Max C" value={form.warning_max_c} onChange={(warning_max_c) => setForm({ ...form, warning_max_c })} />
        <LabeledInput label="Critical Max C" value={form.critical_max_c} onChange={(critical_max_c) => setForm({ ...form, critical_max_c })} />
        <LabeledInput label="Stale Seconds" value={form.stale_after_seconds} onChange={(stale_after_seconds) => setForm({ ...form, stale_after_seconds })} />
        <button className="self-end rounded-lg bg-[#10B981] px-4 py-2 text-sm font-black text-[#07110d]" type="submit">Save Rule</button>
      </form>
      <p className="mb-3 text-xs font-semibold text-zinc-400">Seeded rooms/sensors available: {rooms.length} rooms. Current global rule: {effective ? `warning ${effective.warning_max_c}C, critical ${effective.critical_max_c}C` : "none"}</p>
      <DataTable headers={["Scope", "Target", "Warning", "Critical", "Stale", "Active", "Actions"]} rows={rows.map((row) => [row.scope_type, row.scope_key ?? row.scope_id ?? "all", row.warning_max_c ?? "", row.critical_max_c ?? "", row.stale_after_seconds, row.is_active ? "Yes" : "No", <button className="text-rose-300" onClick={async () => { if (confirm("Delete this threshold rule?")) { await adminApi.deleteThreshold(row.id); toast("success", "Threshold deleted."); load(); } }}>Delete</button>])} />
    </Panel>
  );
}

function ReportsPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [duration, setDuration] = useState("24h");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rooms, setRooms] = useState("");
  const [groups, setGroups] = useState("");
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeFaults, setIncludeFaults] = useState(true);
  return (
    <Panel title="Excel Reports">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block space-y-1"><span className="text-xs font-black uppercase tracking-widest text-zinc-400">Duration</span><select className="w-full rounded-lg border border-[#263442] bg-[#0b1117] px-3 py-2 text-sm" value={duration} onChange={(e) => setDuration(e.target.value)}><option value="1h">Last 1 hour</option><option value="8h">Last 8 hours</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option></select></label>
        {duration === "custom" && <><LabeledInput label="From ISO" value={from} onChange={setFrom} /><LabeledInput label="To ISO" value={to} onChange={setTo} /></>}
        <LabeledInput label="Rooms CSV" value={rooms} onChange={setRooms} placeholder="1,2,3" />
        <LabeledInput label="Groups CSV" value={groups} onChange={setGroups} placeholder="CR123,CR456" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-5 text-sm font-bold text-zinc-200">
        <label className="flex items-center gap-2"><Toggle checked={includeAlerts} onChange={setIncludeAlerts} /> Include alerts</label>
        <label className="flex items-center gap-2"><Toggle checked={includeFaults} onChange={setIncludeFaults} /> Include sensor faults</label>
        <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-black text-[#07110d]" onClick={async () => { const params = new URLSearchParams({ format: "xlsx", include_alerts: String(includeAlerts), include_faults: String(includeFaults) }); if (duration === "custom") { params.set("from", from); params.set("to", to); } else params.set("duration", duration); if (rooms) params.set("rooms", rooms); if (groups) params.set("groups", groups); const blob = await adminApi.downloadReport(params); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "cold-room-temperature-report.xlsx"; link.click(); URL.revokeObjectURL(url); toast("success", "Report downloaded."); }} type="button">Download Excel</button>
      </div>
    </Panel>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [faults, setFaults] = useState<SensorFault[]>([]);
  useEffect(() => { adminApi.alerts().then(setAlerts); adminApi.sensorFaults().then(setFaults); }, []);
  return <div className="space-y-5"><Panel title="Alerts"><DataTable headers={["Severity", "Status", "Message", "Opened"]} rows={alerts.map((a) => [a.severity, a.status, a.message, new Date(a.opened_at).toLocaleString()])} /></Panel><Panel title="Sensor Faults"><DataTable headers={["Sensor", "Type", "Status", "Message", "Last Seen"]} rows={faults.map((f) => [f.source_tag, f.fault_type, f.status, f.message, new Date(f.last_seen_at).toLocaleString()])} /></Panel></div>;
}

function SystemHealthPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { adminApi.health().then(setRows); }, []);
  return <Panel title="System Health"><DataTable headers={["Source", "Last Success", "Last Error", "Rows"]} rows={rows.map((r) => [String(r.source ?? ""), String(r.last_success_at ?? "Never"), String(r.last_error ?? ""), String(r.rows_ingested ?? 0)])} /></Panel>;
}

function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  useEffect(() => { adminApi.auditLogs().then(setRows); }, []);
  return <Panel title="Audit Logs"><AuditTable rows={rows} /></Panel>;
}

function SettingsPage({ toast }: { toast: (kind: Toast["kind"], message: string) => void }) {
  const [rows, setRows] = useState<SystemSetting[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const load = useCallback(() => adminApi.settings().then(setRows), []);
  useEffect(() => { load(); }, [load]);
  return <Panel title="Live Data Settings"><form className="mb-4 grid gap-3 md:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); await adminApi.saveSetting(key, { value, is_secret: isSecret }); toast("success", "Setting saved."); setKey(""); setValue(""); load(); }}><LabeledInput label="Key" value={key} onChange={setKey} /><LabeledInput label="Value" value={value} onChange={setValue} /><label className="flex items-end gap-2 pb-2 text-sm font-bold"><Toggle checked={isSecret} onChange={setIsSecret} /> Secret</label><button className="self-end rounded-lg bg-[#10B981] px-4 py-2 text-sm font-black text-[#07110d]" type="submit">Save</button></form><DataTable headers={["Key", "Value", "Secret", "Updated"]} rows={rows.map((r) => [r.key, String(r.value), r.is_secret ? "Yes" : "No", new Date(r.updated_at).toLocaleString()])} /></Panel>;
}

function AuditTable({ rows }: { rows: AuditLog[] | Array<Record<string, unknown>> }) {
  return <DataTable headers={["Action", "Resource", "Actor", "IP", "Time"]} rows={rows.map((row) => [String(row.action ?? ""), `${String(row.resource_type ?? "")} ${String(row.resource_id ?? "")}`, String(row.actor_user_id ?? "system"), String(row.ip_address ?? ""), row.created_at ? new Date(String(row.created_at)).toLocaleString() : ""])} />;
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  if (rows.length === 0) return <EmptyState text="No records found." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-[#263442] text-xs uppercase tracking-widest text-zinc-500">{headers.map((header) => <th className="px-3 py-2" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr className="border-b border-[#263442]/60 text-zinc-200" key={index}>{row.map((cell, cellIndex) => <td className="px-3 py-3 align-top" key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
