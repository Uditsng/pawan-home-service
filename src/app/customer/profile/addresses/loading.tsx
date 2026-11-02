export default function Loading() {
  return (
    <div className="bg-surface-dim min-h-screen pb-24 flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 pb-6 px-4 md:px-6 w-full max-w-full min-w-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3 w-full min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 animate-pulse shrink-0" />
          <div className="w-40 h-6 bg-white/20 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Addresses List */}
      <main className="flex-1 max-w-3xl mx-auto w-full max-w-full px-4 md:px-5 pt-4 md:pt-5 space-y-3 min-w-0">
        {/* Add Address button skeleton */}
        <div className="w-full flex items-center gap-3 p-4 md:p-5 bg-surface-container-lowest rounded-xl shadow-sm mb-4 border border-dashed border-outline-variant/30 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-surface-container-highest shrink-0" />
          <div className="w-32 h-4 bg-surface-container-highest rounded" />
        </div>

        {/* Saved address cards */}
        <div className="space-y-3 w-full min-w-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-4 md:p-5 rounded-xl shadow-sm border border-outline-variant/20 animate-pulse flex justify-between items-start gap-3"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-4 bg-surface-container-highest rounded" />
                    {i === 0 && <div className="w-14 h-4 bg-surface-container-highest rounded-full" />}
                  </div>
                  <div className="w-full h-3.5 bg-surface-container-highest rounded" />
                  <div className="w-2/3 h-3.5 bg-surface-container-highest rounded" />
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <div className="w-8 h-8 bg-surface-container-highest rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
