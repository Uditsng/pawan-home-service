export default function PartnerReferralsLoading() {
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen pb-24 lg:pb-12 flex flex-col animate-pulse">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        <div className="bg-primary rounded-3xl p-6 relative overflow-hidden">
          <div className="w-32 h-4 bg-white/20 rounded-full mb-6" />
          <div className="w-52 h-8 bg-white/30 rounded-xl mb-3" />
          <div className="w-72 h-3 bg-white/15 rounded-full" />
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl" />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl shadow-xs p-5 space-y-4">
          <div className="w-40 h-3 bg-surface-container-highest rounded-full" />
          <div className="h-14 bg-surface-container rounded-2xl" />
          <div className="h-12 bg-surface-container rounded-xl" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-3.5 h-24" />
          ))}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-3xl shadow-xs p-5 space-y-3">
          <div className="w-40 h-3 bg-surface-container-highest rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-surface-container-highest shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-28 h-3 bg-surface-container-highest rounded-full" />
                <div className="w-64 h-2 bg-surface-container rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}