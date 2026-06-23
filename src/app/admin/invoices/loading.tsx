export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-[20px] p-6 border border-outline-variant/10">
            <div className="w-24 h-3 bg-surface-container-high rounded animate-pulse mb-3" />
            <div className="w-32 h-8 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Grid skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls */}
          <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/10 space-y-4">
            <div className="w-full h-10 bg-surface rounded-xl animate-pulse" />
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/15 p-6 space-y-4">
            <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-outline-variant/10">
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
                    <div className="w-40 h-3 bg-surface-container-high rounded animate-pulse" />
                  </div>
                  <div className="w-32 h-4 bg-surface-container-high rounded animate-pulse" />
                  <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-low/30 p-5 border border-outline-variant/20 rounded-[24px] space-y-4">
            <div className="w-32 h-5 bg-surface-container-high rounded animate-pulse" />
            <div className="w-full h-3 bg-surface-container-high rounded animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-surface rounded-xl border border-outline-variant/15 space-y-2">
                  <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
                  <div className="w-full h-10 bg-surface-container-high rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
