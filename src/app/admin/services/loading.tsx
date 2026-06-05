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

      {/* Services grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-[20px] p-5 border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
              <div className="flex-1">
                <div className="w-32 h-4 bg-surface-container-high rounded animate-pulse mb-2" />
                <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-3/4 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
            <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10">
              <div className="w-14 h-5 bg-surface-container-high rounded animate-pulse" />
              <div className="w-16 h-6 bg-surface-container-high rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
