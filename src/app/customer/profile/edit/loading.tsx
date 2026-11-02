export default function Loading() {
  return (
    <div className="bg-surface-dim min-h-screen flex flex-col font-body w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header bar */}
      <div className="bg-surface-container-lowest p-3 md:p-4 border-b border-outline-variant/10 w-full min-w-0 flex items-center gap-3 md:gap-4 animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-surface-container-highest shrink-0" />
        <div className="w-32 h-6 bg-surface-container-highest rounded" />
      </div>

      {/* Form Content */}
      <div className="p-3 md:p-4 flex-1 w-full max-w-full min-w-0">
        <div className="bg-surface-container-lowest rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm w-full mx-auto max-w-lg mb-24 min-w-0 border border-outline-variant/10 space-y-6 animate-pulse">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-25 h-25 rounded-full bg-surface-container-highest" />
          </div>

          {/* Form Fields */}
          <div className="space-y-4 w-full min-w-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="w-20 h-3 bg-surface-container-highest rounded ml-1" />
                <div className="w-full h-12 bg-surface-container rounded-xl border border-outline-variant/20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-center pb-safe z-30">
        <div className="w-full max-w-lg h-12 md:h-14 bg-surface-container-highest rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
