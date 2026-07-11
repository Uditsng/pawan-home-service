export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-6">
        
        {/* Search bar skeleton */}
        <div className="w-full h-14 bg-surface-container-low rounded-xl border border-outline-variant/10 shadow-xs animate-pulse" />

        <div className="space-y-6 animate-pulse">
          {/* Section: Categories */}
          <section className="space-y-3">
            <div className="w-24 h-4.5 bg-surface-container-high rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high shrink-0" />
                    <div className="w-32 h-4 bg-surface-container-high rounded" />
                  </div>
                  <div className="w-5 h-5 bg-surface-container-high rounded-full" />
                </div>
              ))}
            </div>
          </section>

          {/* Section: Services */}
          <section className="space-y-3">
            <div className="w-20 h-4.5 bg-surface-container-high rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container-high shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="w-36 h-4 bg-surface-container-high rounded" />
                    <div className="w-48 h-3 bg-surface-container-high rounded" />
                  </div>
                  <div className="w-12 h-5 bg-surface-container-high rounded" />
                </div>
              ))}
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
