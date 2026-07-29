export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-start">
        <div>
          <div className="w-32 h-7 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="w-48 h-4 bg-surface-container-high rounded animate-pulse" />
        </div>
        <div className="w-32 h-10 bg-surface-container-high rounded-xl animate-pulse" />
      </div>

      {/* Metric header skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4">
            <div className="w-16 h-3 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-12 h-7 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 space-y-3">
        <div className="w-full h-8 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="flex gap-2">
          <div className="w-12 h-7 bg-surface-container-high rounded-lg animate-pulse" />
          <div className="w-24 h-7 bg-surface-container-high rounded-lg animate-pulse" />
          <div className="w-20 h-7 bg-surface-container-high rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Services card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-[20px] p-5 border border-outline-variant/10">
            <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse mb-4" />
            <div className="w-3/4 h-4 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-1/2 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/10">
              <div className="w-14 h-5 bg-surface-container-high rounded animate-pulse" />
              <div className="w-16 h-6 bg-surface-container-high rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}