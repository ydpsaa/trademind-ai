import { GlassSkeleton } from "@/components/ui/GlassSkeleton";

interface PageLoadingShellProps {
  variant?: "dashboard" | "table" | "grid" | "form";
}

export function PageLoadingShell({ variant = "grid" }: PageLoadingShellProps) {
  const mainGrid = variant === "dashboard" ? "xl:grid-cols-5" : variant === "table" ? "xl:grid-cols-4" : "xl:grid-cols-3";

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(255,255,255,.13),transparent_28%),linear-gradient(180deg,#050505,#000)]" />
      <div className="relative grid min-h-screen w-full gap-3.5 p-3.5 lg:grid-cols-[210px_minmax(0,1fr)] min-[1400px]:grid-cols-[210px_minmax(0,1fr)_286px] 2xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="glass-panel sticky top-4 hidden max-h-[calc(100vh-2rem)] rounded-3xl p-3 lg:block">
          <GlassSkeleton className="mb-6 h-12" />
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => <GlassSkeleton key={index} className="h-10" />)}
          </div>
        </aside>
        <section className="min-w-0">
          <GlassSkeleton className="h-16" />
          <div className={`mt-4 grid gap-3 ${mainGrid}`}>
            {Array.from({ length: variant === "dashboard" ? 5 : 4 }).map((_, index) => <GlassSkeleton key={index} className="h-24" />)}
          </div>
          {variant === "form" ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 4 }).map((_, index) => <GlassSkeleton key={index} className="h-44" />)}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-12">
              <GlassSkeleton className="h-72 lg:col-span-8" />
              <GlassSkeleton className="h-72 lg:col-span-4" />
              <GlassSkeleton className="h-64 lg:col-span-6" />
              <GlassSkeleton className="h-64 lg:col-span-6" />
            </div>
          )}
        </section>
        <aside className="hidden min-[1400px]:block">
          <GlassSkeleton className="h-80" />
          <GlassSkeleton className="mt-4 h-56" />
        </aside>
      </div>
    </main>
  );
}
