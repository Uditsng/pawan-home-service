export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 lg:pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 space-y-6">
        <div className="w-48 h-6 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 animate-pulse">
              <div className="w-16 h-8 bg-surface-container-high rounded mb-2" />
              <div className="w-24 h-3 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 animate-pulse">
          <div className="w-full h-64 bg-surface-container-high rounded-xl" />
        </div>
      </main>
    </div>
  );
}
