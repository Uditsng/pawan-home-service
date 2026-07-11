export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] min-h-screen pb-24 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
          <div>
            <h1 className="text-[20px] md:text-[24px] font-extrabold tracking-wide animate-pulse bg-white/20 w-32 h-6 rounded mb-2" />
            <p className="text-[12px] text-on-primary/60 font-medium animate-pulse bg-white/10 w-48 h-4 rounded" />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-5 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100 animate-pulse space-y-3"
          >
            {/* Top row */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="w-48 h-5 bg-slate-200 rounded mb-1.5" />
                <div className="w-24 h-3 bg-slate-200 rounded" />
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="w-3.5 h-3.5 bg-slate-200 rounded-full" />
                ))}
              </div>
            </div>

            {/* Comment block placeholder */}
            <div className="w-full h-12 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </main>
    </div>
  );
}
