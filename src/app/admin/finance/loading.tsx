export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div>
          <div className="w-28 h-7 bg-surface-container-high rounded mb-2" />
          <div className="w-56 h-4 bg-surface-container-high rounded" />
        </div>
      </div>

      {/* Period pills */}
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-16 h-7 bg-surface-container-high rounded-lg" />
        ))}
      </div>

      {/* 6 Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface-container-high rounded-2xl p-4 space-y-2">
            <div className="w-20 h-2.5 bg-surface-dim rounded" />
            <div className="w-16 h-5 bg-surface-dim rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-surface-container-high rounded-2xl p-4">
        <div className="w-24 h-3 bg-surface-dim rounded mb-3" />
        <div className="h-20 bg-surface-dim rounded" />
      </div>

      {/* Filter controls */}
      <div className="bg-surface-container-high rounded-2xl p-3 flex justify-between">
        <div className="flex gap-1">
          <div className="w-16 h-7 bg-surface-dim rounded-lg" />
          <div className="w-16 h-7 bg-surface-dim rounded-lg" />
          <div className="w-16 h-7 bg-surface-dim rounded-lg" />
        </div>
        <div className="w-40 h-7 bg-surface-dim rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface-container-high rounded-2xl border border-outline-variant/10">
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-surface-dim rounded" />
                <div className="space-y-1">
                  <div className="w-24 h-3 bg-surface-dim rounded" />
                  <div className="w-16 h-2 bg-surface-dim rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-12 h-3 bg-surface-dim rounded" />
                <div className="w-12 h-3 bg-surface-dim rounded" />
                <div className="w-12 h-3 bg-surface-dim rounded" />
                <div className="w-14 h-5 bg-surface-dim rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
