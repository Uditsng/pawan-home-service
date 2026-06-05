export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Header skeleton */}
      <header className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pb-8">
        <section className="mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-6">
          <div className="w-32 h-7 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="w-56 h-4 bg-surface-container-high rounded animate-pulse" />
        </section>

        {/* Tab skeleton */}
        <div className="px-4 md:px-6 mb-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-20 h-8 bg-surface-container-high rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Booking cards skeleton */}
        <div className="px-4 md:px-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest p-4 md:p-5 rounded-xl border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="w-16 h-4 bg-surface-container-high rounded animate-pulse" />
                <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="w-24 h-3 bg-surface-container-high rounded animate-pulse mb-3" />
              <div className="flex justify-between pt-3 border-t border-surface-variant/30">
                <div className="w-16 h-5 bg-surface-container-high rounded animate-pulse" />
                <div className="w-14 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
