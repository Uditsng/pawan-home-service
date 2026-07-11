export default function Loading() {
  return (
    <div className="bg-[#f5f6f8] min-h-screen flex flex-col font-sans">
      {/* Header */}
      <div className="bg-primary text-on-primary pt-5 pb-6 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
          <h1 className="text-[18px] md:text-[22px] font-extrabold tracking-wide animate-pulse bg-white/20 w-32 h-6 rounded" />
        </div>
      </div>

      {/* Form Content */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 md:px-5 pt-8 space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-3 mb-6 animate-pulse">
          <div className="w-[100px] h-[100px] rounded-full bg-slate-200" />
          <div className="w-24 h-4 bg-slate-200 rounded" />
        </div>

        {/* Form Fields */}
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-full h-11 bg-white rounded-lg border border-slate-100" />
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-4">
            <div className="w-full h-11 bg-slate-200 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
