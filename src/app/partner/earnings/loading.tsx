export default function Loading() {
  return (
    <div className="bg-surface text-on-surface min-h-screen pb-24 lg:pb-10 font-body">
      <main className="max-w-lg mx-auto px-2.5 py-2 space-y-2 animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-14 h-7 bg-surface-container-high rounded-lg" />
            ))}
          </div>
          <div className="text-right space-y-1">
            <div className="w-20 h-6 bg-surface-container-high rounded ml-auto" />
            <div className="w-14 h-3 bg-surface-container-high rounded ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-container-high rounded-lg p-2 space-y-1.5">
              <div className="w-16 h-2.5 bg-surface-dim rounded" />
              <div className="w-12 h-4 bg-surface-dim rounded" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="w-24 h-3 bg-surface-container-high rounded" />
          <div className="w-20 h-3 bg-surface-container-high rounded ml-auto" />
        </div>
        <div className="bg-surface-container-high rounded-lg p-2 h-7" />
        <div className="space-y-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-container-high rounded-lg p-2.5 flex items-center justify-between">
              <div className="w-32 h-3 bg-surface-dim rounded" />
              <div className="w-12 h-3 bg-surface-dim rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
