export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Service header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-surface-container-high rounded-2xl animate-pulse" />
          <div>
            <div className="w-48 h-7 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse" />
          </div>
        </div>

        {/* Price + CTA skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="w-20 h-3 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="w-16 h-8 bg-surface-container-high rounded animate-pulse" />
            </div>
            <div className="w-32 h-12 bg-surface-container-high rounded-full animate-pulse" />
          </div>
        </div>

        {/* About skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
          <div className="w-28 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="space-y-2">
            <div className="w-full h-3 bg-surface-container-high rounded animate-pulse" />
            <div className="w-full h-3 bg-surface-container-high rounded animate-pulse" />
            <div className="w-3/4 h-3 bg-surface-container-high rounded animate-pulse" />
          </div>
        </div>

        {/* Inclusions skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-6">
          <div className="w-32 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-surface-container-high rounded-full animate-pulse" />
                <div className="w-48 h-3 bg-surface-container-high rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* FAQs skeleton */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
          <div className="w-24 h-5 bg-surface-container-high rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-container-high rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
