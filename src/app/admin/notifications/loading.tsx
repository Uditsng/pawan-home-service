export default function Loading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <div className="w-40 h-6 bg-surface-container-high rounded animate-pulse" />
          <div className="w-56 h-3 bg-surface-container-high rounded mt-1 animate-pulse" />
        </div>
        <div className="w-32 h-10 bg-surface-container-high rounded-[20px] animate-pulse" />
      </div>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 bg-surface-container-high rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-3 bg-surface-container-high rounded" />
                <div className="w-32 h-2 bg-surface-container-high rounded" />
              </div>
              <div className="w-16 h-6 bg-surface-container-high rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
