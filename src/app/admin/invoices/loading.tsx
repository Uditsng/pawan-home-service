export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10">
            <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse mb-3" />
            <div className="w-16 h-8 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Time period chips */}
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-20 h-7 bg-surface-container-high rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Table skeleton */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/10">
            <div className="w-full h-9 bg-surface rounded-xl animate-pulse" />
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-outline-variant/10 last:border-0">
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-surface-container-high rounded animate-pulse" />
                  <div className="w-48 h-3 bg-surface-container-high rounded animate-pulse" />
                </div>
                <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
                <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-3">
            <div className="w-32 h-5 bg-surface-container-high rounded animate-pulse" />
            <div className="w-full h-3 bg-surface-container-high rounded animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2.5 bg-surface rounded-xl border border-outline-variant/15 space-y-2">
                <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
                <div className="w-full h-8 bg-surface-container-high rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
