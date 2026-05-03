"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";
  const nextPath = searchParams.get("next") || "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || null,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.session) {
          setMessage("Account created. Please confirm your email before signing in.");
          return;
        }

        router.refresh();
        router.push(nextPath);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.session) {
        setError("Sign in did not return a session. Please try again.");
        return;
      }

      router.refresh();
      router.push(nextPath);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,.18),transparent_30%),radial-gradient(circle_at_0%_75%,rgba(255,255,255,.08),transparent_34%),linear-gradient(180deg,#050505,#000)]" />
      <div className="relative grid min-h-screen place-items-center px-4 py-10">
        <GlassCard className="w-full max-w-md p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6" />
            <div className="text-sm font-semibold uppercase tracking-[0.18em]">TradeMind AI</div>
          </div>
          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight">{isRegister ? "Create account" : "Welcome back"}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isRegister ? "Start your AI trading workspace with email and password." : "Sign in to continue to your dashboard."}
            </p>
          </div>
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {isRegister ? (
              <label className="block text-sm">
                <span className="text-zinc-400">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25"
                  placeholder="Alex Trader"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-zinc-400">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25"
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-400">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25"
                placeholder="Minimum 6 characters"
              />
            </label>
            {message ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</div> : null}
            {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div> : null}
            <button disabled={loading} className="h-11 w-full rounded-xl border border-white/10 bg-white/15 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-zinc-400">
            {isRegister ? "Already have an account?" : "New to TradeMind AI?"}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="font-medium text-white hover:underline">
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
        </GlassCard>
      </div>
    </main>
  );
}
