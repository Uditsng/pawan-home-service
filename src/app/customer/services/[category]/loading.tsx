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
        <div className="w-48 h-8 bg-surface-container-high rounded animate-pulse mb-2" />
        <div className="w-72 h-4 bg-surface-container-high rounded animate-pulse mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-[24px] p-5 md:p-6 border border-outline-variant/10">
              <div className="w-14 h-14 bg-surface-container-high rounded-[20px] animate-pulse mb-4" />
              <div className="w-36 h-5 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="w-48 h-3 bg-surface-container-high rounded animate-pulse mb-4" />
              <div className="flex justify-between items-center">
                <div className="w-16 h-5 bg-surface-container-high rounded animate-pulse" />
                <div className="w-20 h-9 bg-surface-container-high rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
