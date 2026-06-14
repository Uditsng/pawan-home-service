export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <header className="sticky top-0 w-full z-50 bg-surface/90 backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          <div className="w-12 h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-surface-container-high rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Profile header skeleton */}
        <div className="bg-primary rounded-3xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full animate-pulse" />
            <div>
              <div className="w-32 h-5 bg-white/20 rounded animate-pulse mb-2" />
              <div className="w-48 h-3 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Settings list skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 divide-y divide-outline-variant/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-container-high rounded-xl animate-pulse" />
                <div className="w-28 h-4 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-surface-container-high rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
