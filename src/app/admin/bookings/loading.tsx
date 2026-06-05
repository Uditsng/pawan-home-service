export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-start">
        <div>
          <div className="w-32 h-7 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-surface-container-high rounded animate-pulse" />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-24 h-9 bg-surface-container-high rounded-xl animate-pulse shrink-0" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/10 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 p-4 border-b border-outline-variant/10 bg-surface-container-low/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 bg-surface-container-high rounded animate-pulse" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-outline-variant/5">
            <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
            <div className="flex-1 h-4 bg-surface-container-high rounded animate-pulse" />
            <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
            <div className="w-16 h-6 bg-surface-container-high rounded-lg animate-pulse" />
            <div className="w-16 h-4 bg-surface-container-high rounded animate-pulse" />
            <div className="w-8 h-8 bg-surface-container-high rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
