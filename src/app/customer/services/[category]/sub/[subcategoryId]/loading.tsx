export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
      {/* Subcategory Title Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-2 animate-pulse">
        <div className="flex items-center gap-3 md:gap-4 mb-2">
          <div className="w-6 h-6 bg-surface-container-high rounded" />
          <div className="w-48 h-6 bg-surface-container-high rounded" />
        </div>
        <div className="w-24 h-4 bg-surface-container-high rounded pl-9" />
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-40">
        {/* Services Grid skeleton */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-low p-3 sm:p-4 md:p-5 rounded-xl flex flex-col items-center justify-start text-center border border-outline-variant/10 shadow-xs h-auto min-h-[140px] sm:min-h-[155px] md:min-h-[175px] w-full animate-pulse"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-surface-container-high mb-3 flex items-center justify-center shrink-0" />
              
              <div className="min-h-10 flex items-center justify-center w-full px-1 mb-1.5">
                <div className="w-16 h-3.5 bg-surface-container-high rounded" />
              </div>
              
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-12 h-4 bg-surface-container-high rounded" />
                <div className="w-8 h-3 bg-surface-container-high rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
