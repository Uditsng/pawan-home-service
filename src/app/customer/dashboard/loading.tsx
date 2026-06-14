export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Header skeleton */}
      <header className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
            <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        {/* Carousel skeleton */}
        <div className="mb-6 md:mb-10">
          <div className="w-full aspect-[2.2/1] bg-surface-container-high rounded-2xl animate-pulse" />
        </div>

        {/* Services grid skeleton */}
        <section className="mb-8 md:mb-12">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-container-low p-3 md:p-5 rounded-xl flex flex-col items-center border border-outline-variant/10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container-high mb-2 md:mb-3 animate-pulse" />
                <div className="w-16 h-3 bg-surface-container-high rounded animate-pulse mb-1" />
                <div className="w-8 h-2.5 bg-surface-container-high rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {/* Bookings skeleton */}
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-end mb-4 md:mb-6">
            <div>
              <div className="w-48 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="w-32 h-3 bg-surface-container-high rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[250px] md:min-w-[280px] bg-surface-container-lowest p-4 md:p-5 rounded-xl border border-outline-variant/10">
                <div className="w-16 h-4 bg-surface-container-high rounded animate-pulse mb-3" />
                <div className="w-32 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
                <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
                <div className="w-full h-px bg-surface-container-high mb-3" />
                <div className="flex justify-between">
                  <div className="w-12 h-5 bg-surface-container-high rounded animate-pulse" />
                  <div className="w-16 h-4 bg-surface-container-high rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
