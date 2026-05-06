import BottomNav from "@/components/BottomNav";
import CustomerHeader from "@/components/CustomerHeader";
import Image from "next/image";

export default function WalletPage() {
  return (
    <div className="bg-surface text-on-background min-h-screen pb-24">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 md:space-y-10">
        {/* Header Section */}
        <section className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-primary">My Wallet</h1>
          <p className="text-on-surface-variant max-w-md text-sm md:text-base">Manage your credits, review history, and secure premium service bookings instantly.</p>
        </section>

        {/* Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-stretch">
          <div className="md:col-span-7 bg-primary-container rounded-xl p-6 md:p-8 text-on-primary-container relative overflow-hidden shadow-[0_12px_32px_rgba(0,104,95,0.1)]">
            <div className="absolute top-[-20%] right-[-10%] w-48 md:w-64 h-48 md:h-64 bg-primary rounded-full blur-[80px] opacity-40"></div>
            <div className="relative z-10 space-y-4 md:space-y-6">
              <div className="flex justify-between items-start">
                <span className="text-xs md:text-sm font-medium opacity-80">Available Balance</span>
                <span className="material-symbols-outlined text-[20px] md:text-[24px]">account_balance_wallet</span>
              </div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter">₹12.50</div>
              <div className="pt-2 md:pt-4 flex gap-4">
                <button className="bg-primary hover:opacity-90 transition-all text-white px-6 md:px-8 py-3 md:py-3.5 rounded-lg font-bold flex items-center gap-2 active:scale-95 duration-200 text-sm md:text-base">
                  <span className="material-symbols-outlined text-[18px] md:text-[20px]">add</span>
                  Add Money
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats/Info */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 md:space-y-6">
            <div className="bg-surface-container-low p-5 md:p-6 rounded-xl space-y-1 md:space-y-2">
              <h3 className="text-xs md:text-sm font-bold text-primary uppercase tracking-widest">Active Perks</h3>
              <p className="text-base md:text-lg font-semibold text-on-surface">Premium concierge support enabled for all wallet users.</p>
            </div>
            <div className="bg-secondary-fixed p-5 md:p-6 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-on-secondary-fixed-variant font-bold text-sm md:text-base">Refer & Earn</div>
                <div className="text-xs md:text-sm text-on-secondary-fixed opacity-80">Get ₹10 for every friend</div>
              </div>
              <span className="material-symbols-outlined text-secondary">share</span>
            </div>
          </div>
        </div>

        {/* Promotional Banner */}
        <section className="relative rounded-xl overflow-hidden group h-36 md:h-48">
          <Image 
            className="object-cover group-hover:scale-105 transition-transform duration-700" 
            alt="Promotional Banner" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1wPm8eF774czF08lyil62YEGBLoMZu4_gbOPVKfn8Dg5oWSH00vi-qiFxnbZ8shFiSsEsMbgsKm4NI-Sb6LpCz6ZLjsl6dKyzesXIkRCS8Mk80_CTSlzASPB8mN2kzraR2skQzZOLBSOecIq_WrRJePAzJugk8_GHsUlMrGChyN_qHAq-UasUqTA0h2ALIbRUUrLHIoRjoDoB0hDzXVTZKRicezDP-hQHVs4SkM353N9b9UJuf-3fSuibNIA1dsjKub5FkFjmz4k"
            fill
          />
          <div className="absolute inset-0 bg-linear-to-r from-secondary/90 via-secondary/60 to-transparent flex flex-col justify-center px-6 md:px-10 text-white">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-1 md:mb-2">Weekend Special</span>
            <h2 className="text-lg md:text-2xl font-bold max-w-xs">15% Cashback on all HVAC & AC Repairs</h2>
            <div className="mt-3 md:mt-4 inline-flex items-center gap-2 text-xs md:text-sm font-bold cursor-pointer">
              View Offers <span className="material-symbols-outlined text-sm md:text-base">arrow_forward</span>
            </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="space-y-4 md:space-y-6">
          <div className="flex items-end justify-between">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Recent Activity</h2>
            <button className="text-xs md:text-sm font-bold text-primary hover:underline">Download PDF</button>
          </div>
          <div className="space-y-2 md:space-y-3">
            {/* Transaction Item 1 */}
            <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl flex items-center justify-between hover:bg-white transition-colors duration-300 shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px] md:text-[24px]">home_repair_service</span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm md:text-base truncate">AC Repair Payment</div>
                  <div className="text-xs md:text-sm text-on-surface-variant truncate">Oct 24, 2:15 PM • #TRX-9982</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-bold text-on-surface text-sm md:text-base">-₹69.00</div>
                <div className="text-[10px] md:text-xs text-error font-medium">Completed</div>
              </div>
            </div>

            {/* Transaction Item 2 */}
            <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl flex items-center justify-between hover:bg-white transition-colors duration-300 shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px] md:text-[24px]">add_card</span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm md:text-base truncate">Added to Wallet</div>
                  <div className="text-xs md:text-sm text-on-surface-variant truncate">Oct 22, 10:45 AM • Visa ****4242</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-bold text-primary text-sm md:text-base">+₹50.00</div>
                <div className="text-[10px] md:text-xs text-primary font-medium">Verified</div>
              </div>
            </div>

            {/* Transaction Item 3 */}
            <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl flex items-center justify-between hover:bg-white transition-colors duration-300 shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary text-[20px] md:text-[24px]">redeem</span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-on-surface text-sm md:text-base truncate">Cashback received</div>
                  <div className="text-xs md:text-sm text-on-surface-variant truncate">Oct 20, 11:00 AM • Promotional</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-bold text-secondary text-sm md:text-base">+₹5.00</div>
                <div className="text-[10px] md:text-xs text-secondary font-medium">Credited</div>
              </div>
            </div>
          </div>
          <button className="w-full py-3.5 md:py-4 rounded-xl bg-surface-container-low text-on-surface-variant font-bold text-xs md:text-sm hover:bg-surface-container-high transition-colors">
            Load more activity
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
