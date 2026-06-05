export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-32">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-lg border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-8">
        {/* Active job banner skeleton */}
        <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl h-20 animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Earnings card */}
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6">
            <div className="w-24 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
            <div className="w-32 h-10 bg-surface-container-high rounded animate-pulse mb-6" />
            <div className="space-y-4">
              <div className="flex justify-between border-l-4 border-surface-container-high pl-3">
                <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
                <div className="w-8 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="flex justify-between border-l-4 border-surface-container-high pl-3">
                <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
                <div className="w-12 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Job request card */}
          <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-6 md:p-8">
            <div className="w-28 h-5 bg-surface-container-high rounded-full animate-pulse mb-4" />
            <div className="w-48 h-7 bg-surface-container-high rounded animate-pulse mb-6" />
            <div className="flex gap-6 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-container-high rounded animate-pulse" />
                  <div>
                    <div className="w-16 h-2.5 bg-surface-container-high rounded animate-pulse mb-1.5" />
                    <div className="w-20 h-4 bg-surface-container-high rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full h-12 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Upcoming jobs skeleton */}
        <section className="space-y-5">
          <div className="w-36 h-6 bg-surface-container-high rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
                  <div>
                    <div className="w-28 h-4 bg-surface-container-high rounded animate-pulse mb-2" />
                    <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-16 h-8 bg-surface-container-high rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* Performance metrics skeleton */}
        <div className="bg-surface-container-low border border-surface-container-highest rounded-4xl p-6 lg:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center px-2">
              <div className="w-12 h-8 bg-surface-container-high rounded animate-pulse mx-auto mb-2" />
              <div className="w-16 h-3 bg-surface-container-high rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
