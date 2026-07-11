import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Loading() {
  return (
    <>
      <Header />
      <div className="bg-surface font-body text-on-surface antialiased min-h-screen pb-24">
        {/* Header Bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-2 animate-pulse">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="w-6 h-6 bg-surface-container-high rounded" />
            <div className="w-48 h-8 bg-surface-container-high rounded" />
          </div>
          <div className="w-24 h-4 bg-surface-container-high rounded pl-9" />
        </div>

        <main className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-20">
          {/* Search Bar skeleton */}
          <section className="mb-6 md:mb-8 animate-pulse">
            <div className="w-full h-14 bg-surface-container-low rounded-xl border border-outline-variant/10 shadow-sm" />
          </section>

          {/* Subcategories grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-low p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-outline-variant/10 shadow-sm aspect-square animate-pulse"
              >
                <div className="w-14 h-14 md:w-18 md:h-18 rounded-xl md:rounded-2xl bg-surface-container-high mb-3 md:mb-4" />
                <div className="w-28 h-4 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
