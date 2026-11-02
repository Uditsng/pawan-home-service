export default function Loading() {
  return (
    <div className="bg-surface-dim min-h-screen pb-24 font-body w-full max-w-full overflow-x-hidden min-w-0 flex flex-col">
      <main className="w-full max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4 flex-1 min-w-0">
        {/* Hero Banner skeleton */}
        <div className="bg-primary rounded-3xl p-6 relative overflow-hidden animate-pulse min-h-48 flex flex-col justify-between w-full min-w-0">
          <div className="w-24 h-4 bg-white/20 rounded mb-4" />
          <div className="space-y-2">
            <div className="w-28 h-5 bg-white/20 rounded-full mb-3" />
            <div className="w-48 h-8 bg-white/20 rounded" />
            <div className="w-64 h-4 bg-white/20 rounded" />
          </div>
        </div>

        {/* Referral Code Card skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl md:rounded-[20px] shadow-sm p-5 space-y-3 animate-pulse w-full min-w-0">
          <div className="w-32 h-4 bg-surface-container-highest rounded pb-1" />
          <div className="w-full h-14 bg-surface-container-highest rounded-2xl" />
          <div className="w-full h-12 bg-surface-container-highest rounded-xl" />
        </div>

        {/* Stats Grid skeleton */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 animate-pulse w-full min-w-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-3 sm:p-3.5 rounded-2xl shadow-sm flex flex-col items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 bg-surface-container-highest rounded-full" />
              <div className="w-12 h-5 bg-surface-container-highest rounded" />
              <div className="w-16 h-3 bg-surface-container-highest rounded" />
            </div>
          ))}
        </div>

        {/* How it works skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl md:rounded-[20px] shadow-sm p-5 space-y-4 animate-pulse w-full min-w-0">
          <div className="w-28 h-4 bg-surface-container-highest rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-surface-container-highest shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-16 h-3 bg-surface-container-highest rounded" />
                  <div className="w-32 h-4 bg-surface-container-highest rounded" />
                  <div className="w-full h-3 bg-surface-container-highest rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl md:rounded-[20px] shadow-sm p-5 space-y-4 animate-pulse w-full min-w-0">
          <div className="w-32 h-4 bg-surface-container-highest rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-highest shrink-0" />
                  <div className="space-y-1">
                    <div className="w-24 h-4 bg-surface-container-highest rounded" />
                    <div className="w-16 h-3 bg-surface-container-highest rounded" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-surface-container-highest rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
