export default function Loading() {
  return (
    <div className="bg-surface-dim text-on-surface antialiased min-h-screen pb-24 font-body w-full max-w-full overflow-x-hidden">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4 w-full min-w-0 overflow-x-hidden">
        {/* Balance Hero Skeleton */}
        <div className="bg-primary rounded-3xl p-6 relative overflow-hidden animate-pulse min-h-40 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <div className="w-20 h-3 bg-white/20 rounded mb-2" />
              <div className="w-36 h-9 bg-white/25 rounded" />
              <div className="w-44 h-3 bg-white/20 rounded mt-2" />
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-2xl shrink-0" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 mt-3">
            <div>
              <div className="w-16 h-2.5 bg-white/20 rounded mb-1" />
              <div className="w-20 h-4 bg-white/25 rounded" />
            </div>
            <div>
              <div className="w-16 h-2.5 bg-white/20 rounded mb-1" />
              <div className="w-20 h-4 bg-white/25 rounded" />
            </div>
          </div>
        </div>

        {/* Add Money Skeleton Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-xs p-5 space-y-3 animate-pulse">
          <div className="w-28 h-4 bg-surface-container-high rounded" />
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="w-20 h-9 bg-surface-container-low rounded-lg" />
            <div className="w-20 h-9 bg-surface-container-low rounded-lg" />
            <div className="w-20 h-9 bg-surface-container-low rounded-lg" />
            <div className="flex-1 min-w-32 h-9 bg-surface-container-low rounded-lg" />
          </div>
          <div className="w-full h-11 bg-surface-container-high rounded-lg mt-2" />
        </div>

        {/* Activity Skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-xs overflow-hidden animate-pulse">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex justify-between items-center">
            <div className="w-24 h-4 bg-surface-container-high rounded" />
            <div className="w-16 h-3 bg-surface-container rounded" />
          </div>
          <div className="divide-y divide-outline-variant/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-10 h-10 bg-surface-container rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="w-32 h-4 bg-surface-container-high rounded" />
                  <div className="w-24 h-3 bg-surface-container rounded" />
                </div>
                <div className="text-right space-y-1">
                  <div className="w-14 h-4 bg-surface-container-high rounded ml-auto" />
                  <div className="w-16 h-3 bg-surface-container rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
