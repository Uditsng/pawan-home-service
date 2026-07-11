export default function Loading() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24 flex items-center justify-center">
      <main className="max-w-md w-full mx-auto px-4 py-8 text-center space-y-6">
        
        {/* Success Icon Placeholder */}
        <div className="mx-auto w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center animate-pulse" />
        
        {/* Success Title & Text */}
        <div className="space-y-3 animate-pulse">
          <div className="mx-auto w-56 h-7 bg-surface-container-high rounded" />
          <div className="mx-auto w-72 h-4 bg-surface-container-high rounded" />
        </div>

        {/* Booking Card details placeholder */}
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 text-left animate-pulse space-y-4">
          <div className="w-24 h-4 bg-surface-container-high rounded" />
          
          <div className="flex justify-between items-center py-2 border-t border-b border-surface-container-low my-3">
            <div className="space-y-1">
              <div className="w-16 h-3 bg-surface-container-high rounded" />
              <div className="w-32 h-4 bg-surface-container-high rounded" />
            </div>
            <div className="space-y-1 text-right">
              <div className="w-16 h-3 bg-surface-container-high rounded" />
              <div className="w-20 h-4 bg-surface-container-high rounded" />
            </div>
          </div>

          <div className="w-32 h-4 bg-surface-container-high rounded" />
        </div>

        {/* Buttons placeholders */}
        <div className="space-y-3 pt-4">
          <div className="w-full h-12 bg-surface-container-high rounded-xl animate-pulse" />
          <div className="mx-auto w-32 h-4 bg-surface-container-high rounded animate-pulse" />
        </div>

      </main>
    </div>
  );
}
