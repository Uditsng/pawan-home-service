export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] text-on-surface antialiased min-h-screen pb-24 font-body">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">
        {/* Balance Hero */}
        <div className="bg-primary rounded-[24px] p-6 relative overflow-hidden animate-pulse min-h-[160px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div>
              <div className="w-24 h-3 bg-white/20 rounded mb-2" />
              <div className="w-36 h-9 bg-white/20 rounded" />
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-2xl shrink-0" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            <div>
              <div className="w-16 h-2.5 bg-white/20 rounded mb-1" />
              <div className="w-20 h-4 bg-white/20 rounded" />
            </div>
            <div>
              <div className="w-16 h-2.5 bg-white/20 rounded mb-1" />
              <div className="w-20 h-4 bg-white/20 rounded" />
            </div>
          </div>
        </div>

        {/* Action button mock */}
        <div className="w-full h-12 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />

        {/* Transactions List */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm space-y-4 animate-pulse">
          <div className="w-36 h-5 bg-slate-200 rounded mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
                  <div>
                    <div className="w-28 h-4 bg-slate-200 rounded mb-1.5" />
                    <div className="w-20 h-3 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-12 h-4 bg-slate-200 rounded ml-auto mb-1.5" />
                  <div className="w-16 h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
