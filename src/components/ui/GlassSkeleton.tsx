interface GlassSkeletonProps {
  className?: string;
}

export function GlassSkeleton({ className = "" }: GlassSkeletonProps) {
  return <div className={`glass-subtle animate-pulse rounded-2xl ${className}`} />;
}
