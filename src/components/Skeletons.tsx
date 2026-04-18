export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-app bg-white/5 p-3 shadow-card">
      <div className="aspect-square rounded-2xl bg-white/10" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 7 }: { count?: number }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-40 shrink-0">
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}
