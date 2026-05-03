import { AuthDebugPanel } from "@/components/auth/AuthDebugPanel";
import { GlassCard } from "@/components/ui/GlassCard";

export default function AuthDebugPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_45%_0%,rgba(255,255,255,.18),transparent_30%),radial-gradient(circle_at_0%_75%,rgba(255,255,255,.08),transparent_34%),linear-gradient(180deg,#050505,#000)]" />
        <div className="relative grid min-h-screen place-items-center px-4 py-10">
          <GlassCard className="w-full max-w-xl p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Auth Debug</h1>
            <p className="mt-2 text-sm text-zinc-400">Auth debug is disabled in production.</p>
          </GlassCard>
        </div>
      </main>
    );
  }

  return <AuthDebugPanel />;
}
