export default function Loading() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Navigation & Header */}
        <section className="mb-6">
          <div className="w-32 h-4 bg-surface-container-high rounded animate-pulse mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-48 h-8 bg-surface-container-high rounded animate-pulse" />
            <div className="w-16 h-5 bg-surface-container-high rounded-full animate-pulse" />
          </div>
          <div className="w-72 h-4.5 bg-surface-container-high rounded animate-pulse mt-3" />
        </section>

        {/* Bento-Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column: Status Checklist and Booking Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Service Timeline Progress */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-3xl p-6 md:p-8">
              <div className="w-48 h-5 bg-surface-container-high rounded animate-pulse mb-6" />

              <div className="space-y-6 relative before:content-[''] before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-high">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4 relative z-10 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high shrink-0" />
                    <div className="flex flex-col justify-center flex-1">
                      <div className="w-36 h-4 bg-surface-container-high rounded mb-1.5" />
                      <div className="w-56 h-3 bg-surface-container-high rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Service Details & Payments */}
          <div className="flex flex-col gap-6">
            
            {/* Service & Pro Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-3xl p-6 animate-pulse">
              <div className="w-32 h-5 bg-surface-container-high rounded mb-4" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-surface-container-high shrink-0" />
                <div className="flex-1">
                  <div className="w-24 h-4.5 bg-surface-container-high rounded mb-1.5" />
                  <div className="w-16 h-3.5 bg-surface-container-high rounded" />
                </div>
              </div>

              <div className="w-full h-px bg-surface-container-high mb-4" />

              <div className="space-y-3">
                <div className="w-24 h-4 bg-surface-container-high rounded" />
                <div className="w-full h-10 bg-surface-container-high rounded-xl" />
              </div>
            </div>

            {/* Payment summary card */}
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-3xl p-6 animate-pulse">
              <div className="w-32 h-5 bg-surface-container-high rounded mb-4" />
              
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="w-20 h-4 bg-surface-container-high rounded" />
                    <div className="w-12 h-4 bg-surface-container-high rounded" />
                  </div>
                ))}
                
                <div className="w-full h-px bg-surface-container-high my-2" />
                
                <div className="flex justify-between items-center">
                  <div className="w-16 h-5 bg-surface-container-high rounded font-bold" />
                  <div className="w-16 h-5 bg-surface-container-high rounded font-bold" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
