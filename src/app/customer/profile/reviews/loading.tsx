export default function Loading() {
  return (
    <div className="bg-surface-dim min-h-screen pb-24 flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6 w-full max-w-full min-w-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3 w-full min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <div className="w-32 h-6 bg-white/20 rounded animate-pulse" />
            <div className="w-48 h-3.5 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <main className="flex-1 max-w-3xl mx-auto w-full max-w-full px-4 md:px-5 pt-5 space-y-4 min-w-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl md:rounded-[20px] bg-surface-container-lowest/80 border border-outline-variant/15 shadow-sm animate-pulse space-y-3 w-full min-w-0"
          >
            {/* Top row */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="w-48 h-5 bg-surface-container-highest rounded" />
                <div className="w-24 h-3 bg-surface-container-highest rounded" />
              </div>
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-3.5 h-3.5 bg-surface-container-highest rounded-full" />
                ))}
              </div>
            </div>

            {/* Comment block placeholder */}
            <div className="w-full h-12 bg-surface-container rounded-xl border border-outline-variant/10" />
          </div>
        ))}
      </main>
    </div>
  );
}
