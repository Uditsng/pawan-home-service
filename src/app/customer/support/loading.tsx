export default function Loading() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="border-b border-outline-variant/15 pb-6 animate-pulse">
          <div className="w-48 h-9 bg-surface-container-high rounded mb-2" />
          <div className="w-72 h-4.5 bg-surface-container-high rounded" />
        </div>

        {/* Content */}
        <div className="space-y-8 mt-6 animate-pulse">
          <div className="space-y-2">
            <div className="w-full h-4 bg-surface-container-high rounded" />
            <div className="w-2/3 h-4 bg-surface-container-high rounded" />
          </div>

          <div className="border-t border-outline-variant/15 pt-6 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-outline-variant/5 pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-3 bg-surface-container-high rounded uppercase" />
                  <div className="w-64 h-4 bg-surface-container-high rounded" />
                </div>
                <div className="w-9 h-9 bg-surface-container-high rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
