export default function Loading() {
  return (
    <div className="bg-surface min-h-screen pb-24">
      {/* Header skeleton */}
      <header className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Calendar skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
          <div className="w-40 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-full aspect-square bg-surface-container-high rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="w-full aspect-square bg-surface-container rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Time slots skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
          <div className="w-32 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-container-high rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Address skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
          <div className="w-36 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-container-high rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
