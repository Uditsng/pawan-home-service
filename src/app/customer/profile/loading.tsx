export default function Loading() {
  return (
    <div className="bg-surface-dim min-h-screen pb-24 flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      <main className="flex-1 max-w-xl mx-auto w-full max-w-full px-4 md:px-5 pt-4 pb-8 space-y-3 md:space-y-4 min-w-0">
        {/* Profile Card skeleton */}
        <div className="bg-primary text-on-primary rounded-3xl p-5 md:p-6 w-full min-w-0 flex items-center gap-3.5 md:gap-4 animate-pulse shadow-sm">
          <div className="w-16 h-16 md:w-18 md:h-18 rounded-full bg-white/20 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="w-32 h-5 bg-white/20 rounded" />
            <div className="w-48 h-3.5 bg-white/20 rounded" />
            <div className="w-20 h-3.5 bg-white/20 rounded" />
          </div>
        </div>

        {/* Top 2 Action Blocks */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full min-w-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm h-24 md:h-28 animate-pulse flex flex-col justify-between"
            >
              <div className="w-6 h-6 bg-surface-container-highest rounded-full" />
              <div className="w-20 h-4 bg-surface-container-highest rounded" />
            </div>
          ))}
        </div>

        {/* Refer block */}
        <div className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-5 h-5 bg-surface-container-highest rounded" />
            <div className="w-32 h-4 bg-surface-container-highest rounded" />
          </div>
          <div className="w-5 h-5 bg-surface-container-highest rounded-full" />
        </div>

        {/* Links List */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col divide-y divide-outline-variant/10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 md:p-5 animate-pulse">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-5 h-5 bg-surface-container-highest rounded" />
                <div className="w-36 h-4 bg-surface-container-highest rounded" />
              </div>
              <div className="w-5 h-5 bg-surface-container-highest rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
