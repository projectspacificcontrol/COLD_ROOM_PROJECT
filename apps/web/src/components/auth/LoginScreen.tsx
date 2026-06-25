import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Lock, Snowflake, AlertCircle } from "lucide-react";
import { adminApi } from "../../api/adminClient";
import type { CurrentUser } from "../../types/admin";

interface Props {
  onLogin: (user: CurrentUser) => void;
}

/**
 * Authentication gate for the operator dashboard. Credentials are verified by the
 * API against bcrypt-hashed passwords; the request is CSRF-protected and rate
 * limited server-side. User accounts are provisioned from the Admin Console.
 */
export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email || password.length < 8) {
      setError("Enter a valid email and an 8+ character password.");
      return;
    }
    setLoading(true);
    try {
      await adminApi.login(email, password);
      onLogin(await adminApi.me());
    } catch (err) {
      const message = (err as Error).message;
      if (message === "UNAUTHENTICATED") {
        setError("Invalid email or password.");
      } else if (message === "FORBIDDEN") {
        setError("Security check failed. Please refresh the page and try again.");
      } else if (/too many|locked|attempt/i.test(message)) {
        // Server provides the specific lockout / cool-down message (incl. minutes).
        setError(message);
      } else {
        setError("Sign-in failed. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,#152232,#0b1117_60%)] p-6 text-white">
      <div className="w-full max-w-md space-y-6 overflow-hidden rounded-xl border border-[#263442] bg-[#111A22]/80 p-8 shadow-[0_0_40px_rgba(16,185,129,0.06)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#10B981]" />

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#10b981]/25 bg-[#10b981]/10">
            <Snowflake className="h-6 w-6 text-[#10B981]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#10B981] font-mono">SensorCloud // Secure Access</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white">Cold Storage Dashboard</h1>
          <p className="mt-1 text-xs font-semibold text-zinc-400">Sign in to view live cold room telemetry.</p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-mono">Email Address</span>
            <input
              className="w-full rounded-lg border border-[#263442] bg-[#0B1117] px-3.5 py-3 text-sm font-semibold text-white outline-none transition focus:border-[#10B981]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              placeholder="operator@company.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-mono">Password</span>
            <input
              className="w-full rounded-lg border border-[#263442] bg-[#0B1117] px-3.5 py-3 text-sm font-semibold text-white outline-none transition focus:border-[#10B981]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#10B981] py-3.5 text-sm font-black uppercase tracking-wider text-[#0B1117] transition hover:bg-[#0ea571] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Sign In Securely</span>
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
