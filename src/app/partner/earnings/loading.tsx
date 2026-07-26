export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 lg:pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 space-y-6">
        <div className="w-40 h-6 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 animate-pulse">
              <div className="w-20 h-4 bg-surface-container-high rounded mb-3" />
              <div className="w-32 h-8 bg-surface-container-high rounded mb-2" />
              <div className="w-24 h-3 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 animate-pulse">
          <div className="w-48 h-5 bg-surface-container-high rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface-container-high rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="w-40 h-3 bg-surface-container-high rounded" />
                  <div className="w-24 h-2 bg-surface-container-high rounded" />
                </div>
                <div className="w-16 h-4 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
