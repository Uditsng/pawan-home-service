export default function Loading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="w-32 h-6 bg-surface-container-high rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-surface-container-high rounded-full" />
              <div className="space-y-1">
                <div className="w-28 h-3 bg-surface-container-high rounded" />
                <div className="w-20 h-2 bg-surface-container-high rounded" />
              </div>
              <div className="ml-auto flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-surface-container-high rounded" />
                ))}
              </div>
            </div>
            <div className="w-3/4 h-3 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
