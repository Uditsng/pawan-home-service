export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        {/* Promotional Carousel Banner skeleton */}
        <div className="mb-6 md:mb-10">
          <div className="w-full aspect-[2.2/1] bg-surface-container-high rounded-2xl animate-pulse" />
        </div>

        {/* Explore Categories skeleton */}
        <section className="mb-8 md:mb-12">
          <div className="mb-4 md:mb-6">
            <div className="w-48 h-6 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-64 h-4 bg-surface-container-high rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-low p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm aspect-square animate-pulse"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-container-high mb-4" />
                <div className="w-24 h-4 bg-surface-container-high rounded mb-2" />
                <div className="w-12 h-3.5 bg-surface-container-high rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* Trustworthy Section skeleton */}
        <section className="mb-8 md:mb-12 px-1">
          <div className="mb-6">
            <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-56 h-3.5 bg-surface-container-high rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center text-center animate-pulse">
                <div className="w-full aspect-square bg-surface-container-high rounded-2xl mb-3" />
                <div className="w-20 h-3 bg-surface-container-high rounded mb-1" />
                <div className="w-28 h-3 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
