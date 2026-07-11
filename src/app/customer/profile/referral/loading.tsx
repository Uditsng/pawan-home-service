export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] min-h-screen pb-24 font-body">
      <main className="max-w-xl mx-auto px-4 md:px-5 pt-4 pb-8 space-y-4">
        {/* Referral Card */}
        <div className="bg-primary rounded-[24px] p-6 relative overflow-hidden animate-pulse min-h-[220px] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-32 h-4 bg-white/20 rounded" />
            <div className="w-64 h-8 bg-white/20 rounded" />
            <div className="w-48 h-4 bg-white/20 rounded" />
          </div>
          <div className="w-full h-11 bg-white/10 rounded-xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <div className="w-12 h-6 bg-slate-200 rounded mb-2" />
              <div className="w-16 h-3 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* History */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm space-y-4 animate-pulse">
          <div className="w-32 h-5 bg-slate-200 rounded mb-2" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div>
                  <div className="w-24 h-4 bg-slate-200 rounded mb-1" />
                  <div className="w-16 h-3 bg-slate-200 rounded" />
                </div>
                <div className="w-16 h-6 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
