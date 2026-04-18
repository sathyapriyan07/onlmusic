import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../state/AuthProvider";

export default function LoginPage() {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav(loc.state?.from ?? "/", { replace: true });
  }, [user, nav, loc.state?.from]);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await refreshProfile();
      nav(loc.state?.from ?? "/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Helmet>
        <title>Sign in · ONL Music Discovery</title>
      </Helmet>

      <div className="relative overflow-hidden rounded-[32px] border border-app bg-white/5 p-6 shadow-card sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,55,95,0.20),rgba(255,55,95,0)_55%),radial-gradient(circle_at_80%_30%,rgba(10,132,255,0.14),rgba(10,132,255,0)_55%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Sign in to access admin tools (if you’re an admin)."
            : "Create an account to access admin tools (admins only)."}
        </p>

        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-app bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur"
          />

          {err ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div> : null}

          <button
            type="button"
            disabled={loading || !email || !password}
            onClick={submit}
            className="btn-primary w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="btn-secondary w-full rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
