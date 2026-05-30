import { signup } from "@/app/auth.actions";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string; error?: string }>;
}) {
  const resolvedParams = await searchParams;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
        
        body { font-family: 'Bricolage Grotesque', sans-serif; background: #F8FAFC; color: #002261; overflow-x: hidden; }
        
        /* 3D Floating Animations */
        @keyframes float-3d-1 {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: drop-shadow(0 10px 25px rgba(0,0,0,0.3)); }
          50% { transform: translateY(-20px) rotate(8deg) scale(1.05); filter: drop-shadow(0 25px 35px rgba(0,0,0,0.4)); }
        }
        @keyframes float-3d-2 {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); filter: drop-shadow(0 10px 25px rgba(0,0,0,0.2)); }
          50% { transform: translateY(15px) rotate(-6deg) scale(1.08); filter: drop-shadow(0 20px 30px rgba(0,0,0,0.3)); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-float-1 { animation: float-3d-1 7s ease-in-out infinite; }
        .animate-float-2 { animation: float-3d-2 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        
        /* 3D Perspective Utilities (Now handled by Tailwind utilities) */
      `}} />

      <div className="flex min-h-screen bg-surface selection:bg-secondary/30 selection:text-primary flex-row-reverse">

        {/* Left side: Interactive 3D Visual/Brand (Reversed for Register) */}
        <div className="hidden lg:flex w-1/2 p-6 relative perspective-[1000px]">
          <div className="w-full h-full rounded-[32px] bg-cover bg-center overflow-hidden relative group transform-3d shadow-[0_20px_50px_rgba(30,41,59,0.1)] border border-white/50"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80')" }}>

            {/* Color Overlay */}
            <div className="absolute inset-0 bg-linear-to-bl from-primary/80 via-primary/60 to-secondary/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-90"></div>

            {/* Floating 3D Elements */}
            <div className="absolute top-[20%] left-[15%] text-7xl animate-float-1 z-10 opacity-90">🚀</div>
            <div className="absolute top-[40%] right-[10%] text-6xl animate-float-2 z-10 opacity-80" style={{ animationDelay: '1s' }}>🤝</div>
            <div className="absolute bottom-[40%] left-[20%] text-5xl animate-float-1 z-10 opacity-90" style={{ animationDelay: '2s' }}>🌟</div>

            {/* 3D Tilted Glass Card Overlay */}
            <div className="absolute inset-x-8 bottom-12 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transform-3d group-hover:rotate-y-2 group-hover:rotate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out will-change-transform z-20">
              <div className="transform translate-z-[30px]">
                <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-4 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-secondary"></div>
                  Partner Network
                </div>
                <h1 className="text-4xl xl:text-5xl font-black mb-4 tracking-tighter text-white drop-shadow-md leading-tight">
                  Become a<br />Pavan Partner.
                </h1>
                <p className="text-base xl:text-lg text-white/80 max-w-md font-medium">
                  Join the elite network of verified professionals or register your home for premium management.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: 3D Interactive Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative overflow-hidden">

          {/* Animated Background Orbs for Depth */}
          <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,#a6ce37_0%,transparent_70%)] blur-[80px] opacity-20 animate-spin-slow pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-[80px] opacity-20 animate-[spin-slow_25s_linear_infinite_reverse] pointer-events-none"></div>

          {/* Mobile Floating 3D Elements */}
          <div className="lg:hidden absolute top-[15%] left-[10%] text-4xl animate-float-1 z-0 opacity-60 pointer-events-none">🚀</div>
          <div className="lg:hidden absolute top-[40%] right-[5%] text-3xl animate-float-2 z-0 opacity-50 pointer-events-none" style={{ animationDelay: '1s' }}>🤝</div>
          <div className="lg:hidden absolute bottom-[20%] left-[15%] text-5xl animate-float-1 z-0 opacity-50 pointer-events-none" style={{ animationDelay: '2s' }}>🌟</div>

          {/* Navigation Button */}
          <Link href="/" className="absolute top-8 left-8 text-xs font-extrabold uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all flex items-center gap-2 z-20 backdrop-blur-sm border border-transparent hover:border-primary/10">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </Link>

          {/* Glassmorphic Form Container with 3D Hover */}
          <div className="w-full max-w-sm space-y-8 relative z-10  p-8 sm:p-10   transition-all duration-500 will-change-transform">

            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary">Create an account</h2>
              <p className="text-on-surface-variant font-medium mt-2">Join the Pavan Ecosystem</p>
            </div>

            <form action={signup} className="space-y-5">

              <div className="space-y-2 group">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="cursor-pointer group/radio">
                    <input type="radio" name="role" value="customer" className="peer sr-only" defaultChecked />
                    <div className="px-3 py-3 rounded-xl border-2 border-white bg-white/40 text-center text-xs font-bold text-on-surface-variant peer-checked:bg-secondary/10 peer-checked:text-success peer-checked:border-secondary/50 shadow-sm transition-all duration-300 group-hover/radio:-translate-y-0.5 group-hover/radio:shadow-md">
                      👤 Customer
                      <p className="text-[10px] font-normal mt-0.5 opacity-70">Book services</p>
                    </div>
                  </label>
                  <label className="cursor-pointer group/radio">
                    <input type="radio" name="role" value="partner" className="peer sr-only" />
                    <div className="px-3 py-3 rounded-xl border-2 border-white bg-white/40 text-center text-xs font-bold text-on-surface-variant peer-checked:bg-secondary/10 peer-checked:text-success peer-checked:border-secondary/50 shadow-sm transition-all duration-300 group-hover/radio:-translate-y-0.5 group-hover/radio:shadow-md">
                      🔧 Partner
                      <p className="text-[10px] font-normal mt-0.5 opacity-70">Offer services</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Email</label>
                <div className="relative">
                  <input
                    className="w-full px-4 py-3.5 bg-white/50 rounded-xl text-sm font-semibold text-primary focus:outline-none focus:ring-4 focus:ring-secondary/20 transition-all border border-white focus:border-secondary/50 shadow-sm placeholder:text-outline"
                    name="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest group-focus-within:text-secondary transition-colors">Password</label>
                <PasswordInput name="password" placeholder="••••••••" required minLength={6} />
              </div>

              {/* 3D Interactive Button */}
              <div className="pt-2">
                <Button variant="gradient" className="w-full py-4 bg-linear-to-br from-secondary to-[#08e07a] text-primary font-extrabold text-[15px] rounded-xl hover:scale-[1.02] active:scale-95 shadow-[0_8px_20px_rgba(42,245,152,0.3)] hover:shadow-[0_15px_30px_rgba(42,245,152,0.4)] transition-all duration-300 border-none">
                  Sign Up
                </Button>
              </div>

              {resolvedParams?.error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-center text-sm font-bold rounded-xl border border-red-200 shadow-sm animate-pulse">
                  {resolvedParams.error}
                </div>
              )}
            </form>

            <p className="text-center text-sm font-medium text-on-surface-variant">
              Already have an account? <Link href="/login" className="text-success font-extrabold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
