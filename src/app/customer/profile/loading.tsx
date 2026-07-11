export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] min-h-screen pb-24 flex flex-col font-sans">
      {/* Profile header skeleton */}
      <div className="bg-primary text-on-primary pt-5 md:pt-6 pb-6 md:pb-8 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3 md:gap-4 animate-pulse">
          <div className="w-[60px] h-[60px] md:w-[76px] md:h-[76px] rounded-full bg-white/20 shrink-0" />
          <div>
            <div className="w-32 h-5 bg-white/20 rounded mb-2" />
            <div className="w-48 h-3 bg-white/20 rounded mb-2" />
            <div className="w-16 h-3.5 bg-white/20 rounded" />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-4 md:pt-5 space-y-3 md:space-y-4">
        {/* Top 2 Action Blocks */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 md:p-5 rounded-[16px] md:rounded-[20px] shadow-sm h-[90px] md:h-[105px] animate-pulse flex flex-col justify-between"
            >
              <div className="w-6 h-6 bg-slate-200 rounded-full" />
              <div className="w-20 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Refer block */}
        <div className="bg-white p-4 md:p-[18px] rounded-[16px] md:rounded-[20px] shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="w-32 h-4 bg-slate-200 rounded" />
          </div>
          <div className="w-5 h-5 bg-slate-200 rounded-full" />
        </div>

        {/* Links List */}
        <div className="bg-white rounded-[16px] md:rounded-[20px] shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 md:p-5 animate-pulse">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="w-36 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-5 h-5 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
