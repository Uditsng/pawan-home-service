import Link from "next/link";
import Image from "next/image";
export default function LiveTrackingPage({ params }: { params: { id: string } }) {
  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen">
      {/* Top AppBar */}
      <header className="sticky top-0 w-full z-50 bg-[#f7f9fb]/90  backdrop-blur-lg">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0D9488]">location_on</span>
            <h1 className="font-manrope text-sm font-bold tracking-tight text-on-surface">Roorkee, UK</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/bookings" className="material-symbols-outlined text-on-surface-variant hover:opacity-80 transition-all">
              close
            </Link>
          </div>
        </div>
      </header>

      <main className="relative h-[calc(100vh-64px)] w-full">
        {/* Map Canvas Background */}
        <div className="absolute inset-0 z-0">
          <Image

            className="w-full h-full object-cover grayscale-20 contrast-95"
            alt="Map layout"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlRPW4lhWwvYLKSLw-obw-4LOCqsYKhElbhXoVJZ6DwdFr3r4UzthAZv9H8x4HmdsyrhNJpdeonQ0W5xFXKSMH9g0FPPBwy_L-rYqkpAKwuHjUpym_1fQX8FK4rK8stD52iDd0dDIlOwRS6uKDKvi46m8DcZ7hFx8CK0AypY8a7-6SVx1O2FvNWsTr_KEGcG9L3ISzYKwDmPw1UmLYoqIQIRFW38eygovlOERko4hSUqPN4ajMzdUm55ufzTDSxrbyX-JqqK7x99U"
            width="40"
            height="40"
          />
          <div className="absolute inset-0 bg-linear-to-b from-surface/40 via-transparent to-surface/90 pointer-events-none"></div>

          {/* Professional Marker */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="bg-primary-container p-1 rounded-full shadow-lg animate-bounce">
              <Image
                className="w-12 h-12 rounded-full border-2 border-white object-cover"
                alt="Marcus Chen"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3jXmB-Zc-0lVtVQzEyRTdYvAdR9LYSqX98F5bPHiAyfjKF6TYlkIQZtTsZ-de1uZOQjTk1PwtC9IhHqU10Dupp0HtrFHHMhtbk_x1VxWMJwRb0B4uY7j1_NipWkwwt3GA_Oj4yQtAz90XAo6tskDVmTL1Hf39EniURIBBWXWw6liiRgdf0OL7cINfz4uF_BwiCJNGz2K4AzAq8cUQb_onUJnYabxCL67S5vnMyOuFX7UbP1F3serjA89TIov9a2WCvjFoSVv9vR4"
                width="40"
                height="40"
              />
            </div>
            <div className="mt-2 bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Marcus is here</p>
            </div>
          </div>

          {/* Destination Marker */}
          <div className="absolute bottom-1/3 right-1/4 -translate-x-1/2 translate-y-1/2 z-10">
            <div className="bg-secondary p-3 rounded-full shadow-xl">
              <span className="material-symbols-outlined text-on-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            </div>
          </div>

          {/* Route Line (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <path d="M 50% 33% Q 65% 45% 75% 66%" fill="transparent" stroke="url(#route-gradient)" strokeDasharray="8,8" strokeWidth="4"></path>
            <defs>
              <linearGradient id="route-gradient" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#008378"></stop>
                <stop offset="100%" stopColor="#9d4300"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Floating Status Pill */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-surface-container-lowest/90 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.08)] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-semibold text-on-surface tracking-tight">Arriving in <span className="text-primary">12 mins</span></span>
          </div>
        </div>

        {/* Interactive Bottom Panel */}
        <div className="absolute bottom-0 left-0 w-full z-30 px-4 pb-8 md:px-8">
          <div className="max-w-xl mx-auto bg-surface-container-lowest rounded-4xl shadow-[0_-12px_48px_rgba(15,23,42,0.1)] overflow-hidden">
            <div className="p-6 md:p-8 space-y-8">

              {/* Professional Header & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Image
                      width="40"
                      height="40"
                      className="w-16 h-16 rounded-2xl object-cover"
                      alt="Marcus Chen"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYEtTwGrwyEjSjf0N6TpOw0JaKL9H1RtC7o-VJNpdA8yZByR4ivHbK1-mZo41h6QEYpy7UQ-UDLw8J5E-bRwOhEq55KIR6U7e77u9pC-C6nZcbznTkg5L0kzV098f9X3FT2xm36IDGyaDA_6MiBw1Ji7KdSGWy17cxeOg80BNuKrdC35GPTl-4LL3eT502LFmta-WUvmIVcuhCN9zpVup6M6hreNvjDoLQPZWS7WB4WEXwcvPsSSLs42H15XztiC2FDR0HZFTmhaU"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      4.9
                    </div>
                  </div>
                  <div>
                    <h2 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Marcus Chen</h2>
                    <p className="text-sm text-on-surface-variant font-medium">Premium Service Expert</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-low text-primary hover:bg-primary-fixed transition-colors">
                    <span className="material-symbols-outlined">call</span>
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-error-container text-on-error-container hover:bg-error transition-all hover:text-on-error">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                  </button>
                </div>
              </div>

              {/* Progress Tracking */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col items-center gap-2 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-on-primary shadow-sm">
                      <span className="material-symbols-outlined text-xl">check</span>
                    </div>
                    <span className="text-[11px] font-bold text-primary uppercase tracking-tighter">Assigned</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-primary mx-2 mt-[-20px]"></div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-fixed text-primary ring-4 ring-primary-fixed/30">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>near_me</span>
                    </div>
                    <span className="text-[11px] font-bold text-on-surface uppercase tracking-tighter">En Route</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-surface-container-high mx-2 mt-[-20px]"></div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-outline-variant">
                      <span className="material-symbols-outlined text-xl">location_on</span>
                    </div>
                    <span className="text-[11px] font-bold text-outline-variant uppercase tracking-tighter">Arrived</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-surface-container-high mx-2 mt-[-20px]"></div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-outline-variant">
                      <span className="material-symbols-outlined text-xl">task_alt</span>
                    </div>
                    <span className="text-[11px] font-bold text-outline-variant uppercase tracking-tighter">Completed</span>
                  </div>
                </div>

                {/* Status Message Card */}
                <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">schedule</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">En Route - Arriving in 12 mins</h4>
                      <p className="text-xs text-on-surface-variant">Marcus is driving your way now.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30">chevron_right</span>
                </div>
              </div>

              {/* Primary Action */}
              <button className="w-full bg-linear-to-r from-primary to-primary-container py-4 rounded-2xl text-on-primary font-bold text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                Message Marcus
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
