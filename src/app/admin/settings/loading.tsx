export default function Loading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="w-48 h-6 bg-surface-container-high rounded animate-pulse" />
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 animate-pulse">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="w-32 h-3 bg-surface-container-high rounded" />
                <div className="w-48 h-4 bg-surface-container-high rounded" />
              </div>
              <div className="w-20 h-8 bg-surface-container-high rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
