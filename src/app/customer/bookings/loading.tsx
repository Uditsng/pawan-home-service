export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      <main className="max-w-7xl mx-auto pb-8">
        {/* Page Title */}
        <section className="mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-6">
          <div className="w-32 h-8 bg-surface-container-high rounded animate-pulse mb-2" />
          <div className="w-56 h-4.5 bg-surface-container-high rounded animate-pulse" />
        </section>

        {/* Segmented Tabs Control */}
        <div className="flex gap-2 mb-6 md:mb-8 overflow-x-auto no-scrollbar py-1 px-4 md:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-24 h-8 bg-surface-container-high rounded-full animate-pulse shrink-0"
            />
          ))}
        </div>

        {/* Booking Cards List */}
        <div className="grid gap-2 md:gap-3 px-3 md:px-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-3 md:p-4 animate-pulse flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex gap-2">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-surface-container-high shrink-0" />
                  <div>
                    <div className="w-36 h-5 bg-surface-container-high rounded mb-2" />
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-24 h-3.5 bg-surface-container-high rounded" />
                      <div className="w-16 h-3.5 bg-surface-container-high rounded" />
                    </div>
                  </div>
                </div>
                <div className="w-16 h-5 bg-surface-container-high rounded-full" />
              </div>

              {/* Professional UI card placeholder */}
              <div className="bg-surface-container-low rounded-xl p-3 md:p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container-high shrink-0" />
                  <div>
                    <div className="w-20 h-2 bg-surface-container-high rounded mb-1" />
                    <div className="w-28 h-3.5 bg-surface-container-high rounded" />
                  </div>
                </div>
                <div className="w-16 h-4 bg-surface-container-high rounded-full" />
              </div>

              {/* Bottom Buttons placeholder */}
              <div className="flex gap-2 md:gap-3">
                <div className="flex-1 h-10 rounded-xl bg-surface-container-high" />
                <div className="w-24 h-10 rounded-xl bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
