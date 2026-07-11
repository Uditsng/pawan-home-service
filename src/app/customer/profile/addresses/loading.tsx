export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] min-h-screen pb-24 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 pb-6 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-wide animate-pulse bg-white/20 w-40 h-6 rounded" />
        </div>
      </div>

      {/* Addresses List */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-5 space-y-4">
        <div className="flex justify-between items-center pb-2 animate-pulse">
          <div className="w-24 h-4 bg-slate-200 rounded" />
          <div className="w-20 h-8 bg-slate-200 rounded-lg" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100 animate-pulse flex justify-between items-start"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-4 bg-slate-200 rounded" />
                  <div className="w-16 h-4 bg-slate-200 rounded" />
                </div>
                <div className="w-full h-4 bg-slate-200 rounded" />
                <div className="w-2/3 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-5 h-5 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
