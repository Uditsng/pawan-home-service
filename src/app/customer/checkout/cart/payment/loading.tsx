export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Navigation & Header */}
        <section className="no-print mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="w-24 h-4 bg-surface-container-high rounded animate-pulse mb-2" />
            <h1 className="w-48 h-7 bg-surface-container-high rounded animate-pulse font-headline text-2xl font-bold tracking-tight text-primary" />
          </div>
        </section>

        {/* Form and Summary grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Main payment form skeleton */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Address summary */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="w-32 h-4.5 bg-surface-container-high rounded" />
              <div className="w-full h-10 bg-surface-container-low rounded-xl" />
            </div>

            {/* Payment options */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="w-36 h-4.5 bg-surface-container-high rounded" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full h-14 bg-surface-container-low rounded-xl" />
                ))}
              </div>
            </div>

          </div>

          {/* Side summary panel skeleton */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="w-32 h-4.5 bg-surface-container-high rounded mb-4" />
              
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="w-20 h-4 bg-surface-container-high rounded" />
                    <div className="w-12 h-4 bg-surface-container-high rounded" />
                  </div>
                ))}
                <div className="w-full h-px bg-surface-container-high my-2" />
                <div className="flex justify-between font-bold">
                  <div className="w-16 h-5 bg-surface-container-high rounded" />
                  <div className="w-16 h-5 bg-surface-container-high rounded" />
                </div>
              </div>

              <div className="w-full h-12 bg-surface-container-high rounded-xl mt-6" />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
