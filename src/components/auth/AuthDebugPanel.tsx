"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthDebugState {
  initialized: boolean;
  session: boolean;
  email: string | null;
  error: string | null;
}

export function AuthDebugPanel() {
  const [state, setState] = useState<AuthDebugState>({
    initialized: false,
    session: false,
    email: null,
    error: null,
  });

  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          setState({ initialized: true, session: false, email: null, error: error.message });
          return;
        }

        setState({
          initialized: true,
          session: Boolean(data.session),
          email: data.session?.user.email ?? null,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setState({
          initialized: false,
          session: false,
          email: null,
          error: error instanceof Error ? error.message : "Unable to initialize auth client.",
        });
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,.18),transparent_30%),radial-gradient(circle_at_0%_75%,rgba(255,255,255,.08),transparent_34%),linear-gradient(180deg,#050505,#000)]" />
      <div className="relative grid min-h-screen place-items-center px-4 py-10">
        <GlassCard className="w-full max-w-xl p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Auth Debug</h1>
          <p className="mt-2 text-sm text-zinc-400">Local auth status. Keys are not displayed.</p>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10">
            {[
              ["Auth client initialized", state.initialized ? "yes" : "no"],
              ["Current session exists", state.session ? "yes" : "no"],
              ["Current user email", state.email ?? "none"],
              ["Service endpoint configured", hasUrl ? "yes" : "no"],
              ["Client configuration present", hasAnonKey ? "yes" : "no"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="text-zinc-400">{label}</span>
                <span className="text-right font-mono text-white">{value}</span>
              </div>
            ))}
          </div>
          {state.error ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{state.error}</div> : null}
        </GlassCard>
      </div>
    </main>
  );
}
