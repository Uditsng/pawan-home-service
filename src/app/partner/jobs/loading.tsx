export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32">
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-lg border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <div className="w-28 h-6 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-48 h-4 bg-surface-container-high rounded animate-pulse" />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-24 h-9 bg-surface-container-high rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Job cards */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-16 h-5 bg-surface-container-high rounded-full animate-pulse" />
                <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="w-24 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
              <div className="flex gap-3">
                <div className="flex-1 h-10 bg-surface-container-high rounded-xl animate-pulse" />
                <div className="w-28 h-10 bg-surface-container-high rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
