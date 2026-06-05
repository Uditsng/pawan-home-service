export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-start">
        <div>
          <div className="w-28 h-7 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="w-56 h-4 bg-surface-container-high rounded animate-pulse" />
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-[20px] p-6 border border-outline-variant/10">
            <div className="w-24 h-3 bg-surface-container-high rounded animate-pulse mb-3" />
            <div className="w-20 h-8 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-surface-container-lowest rounded-[20px] p-6 border border-outline-variant/10">
        <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-6" />
        <div className="h-64 bg-surface-container rounded-xl animate-pulse" />
      </div>

      {/* Transaction list */}
      <div className="bg-surface-container-lowest rounded-[20px] p-6 border border-outline-variant/10">
        <div className="w-36 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-outline-variant/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-container-high rounded-xl animate-pulse" />
                <div>
                  <div className="w-28 h-4 bg-surface-container-high rounded animate-pulse mb-1" />
                  <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-5 bg-surface-container-high rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
