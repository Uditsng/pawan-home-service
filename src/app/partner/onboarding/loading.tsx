export default function Loading() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 antialiased">
      <div className="w-full max-w-3xl bg-surface-container-lowest p-6 sm:p-10 lg:p-12 rounded-3xl border border-outline-variant/15 relative overflow-hidden my-6 animate-pulse">
        <div className="mb-8 sm:mb-10 text-center space-y-3">
          <div className="w-48 h-4 bg-surface-container-high rounded-full mx-auto" />
          <div className="w-72 h-6 bg-surface-container-high rounded mx-auto" />
          <div className="w-56 h-3 bg-surface-container-high rounded mx-auto" />
        </div>
        <div className="space-y-6">
          <div className="w-60 h-5 bg-surface-container-high rounded" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-container-high rounded-2xl" />
            ))}
          </div>
          <div className="w-60 h-5 bg-surface-container-high rounded" />
          <div className="h-40 bg-surface-container-high rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
