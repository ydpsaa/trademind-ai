import { GlassSkeleton } from "@/components/ui/GlassSkeleton";

interface MainContentLoadingProps {
  variant?: "dashboard" | "table" | "grid" | "form";
}

export function MainContentLoading({ variant = "grid" }: MainContentLoadingProps) {
  const topGrid = variant === "dashboard" ? "xl:grid-cols-5" : variant === "table" ? "xl:grid-cols-4" : "xl:grid-cols-3";

  return (
    <div className="min-w-0 space-y-4" aria-label="Loading page content">
      <GlassSkeleton className="h-16" />
      <div className={`grid gap-3 ${topGrid}`}>
        {Array.from({ length: variant === "dashboard" ? 5 : 4 }).map((_, index) => (
          <GlassSkeleton key={index} className="h-24" />
        ))}
      </div>
      {variant === "form" ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <GlassSkeleton key={index} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassSkeleton className="h-72 lg:col-span-8" />
          <GlassSkeleton className="h-72 lg:col-span-4" />
          <GlassSkeleton className="h-56 lg:col-span-6" />
          <GlassSkeleton className="h-56 lg:col-span-6" />
        </div>
      )}
    </div>
  );
}
