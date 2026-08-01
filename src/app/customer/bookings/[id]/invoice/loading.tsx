export default function Loading() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="w-28 h-4 bg-surface-container-high rounded animate-pulse mb-2" />
            <div className="w-36 h-7 bg-surface-container-high rounded animate-pulse" />
          </div>
          <div className="w-24 h-9 bg-surface-container-high rounded-xl animate-pulse" />
        </section>

        <div className="bg-white p-6 md:p-12 rounded-3xl border border-outline-variant/20 shadow-sm animate-pulse space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b-2 border-primary">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high" />
              <div>
                <div className="w-32 h-5 bg-surface-container-high rounded mb-2" />
                <div className="w-24 h-3 bg-surface-container-high rounded" />
              </div>
            </div>
            <div className="space-y-2 text-left md:text-right">
              <div className="w-28 h-6 bg-surface-container-high rounded" />
              <div className="w-36 h-3 bg-surface-container-high rounded" />
              <div className="w-20 h-3 bg-surface-container-high rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
            <div className="space-y-2">
              <div className="w-28 h-3.5 bg-surface-container-high rounded uppercase" />
              <div className="w-36 h-5 bg-surface-container-high rounded" />
              <div className="w-48 h-3.5 bg-surface-container-high rounded" />
              <div className="w-40 h-3.5 bg-surface-container-high rounded" />
            </div>
            <div className="space-y-2">
              <div className="w-28 h-3.5 bg-surface-container-high rounded uppercase" />
              <div className="w-36 h-5 bg-surface-container-high rounded" />
              <div className="w-48 h-3.5 bg-surface-container-high rounded" />
              <div className="w-40 h-3.5 bg-surface-container-high rounded" />
            </div>
          </div>

          <div className="space-y-4 py-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <div className="space-y-1.5 flex-1">
                  <div className="w-48 h-4.5 bg-surface-container-high rounded" />
                  <div className="w-32 h-3.5 bg-surface-container-high rounded" />
                </div>
                <div className="w-16 h-4.5 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pt-4">
            <div className="w-full md:w-64 ml-auto space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="w-24 h-4 bg-surface-container-high rounded" />
                  <div className="w-16 h-4 bg-surface-container-high rounded" />
                </div>
              ))}
              <div className="w-full h-px bg-surface-container-highest my-1" />
              <div className="flex justify-between font-bold">
                <div className="w-20 h-5 bg-surface-container-high rounded" />
                <div className="w-20 h-5 bg-surface-container-high rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
