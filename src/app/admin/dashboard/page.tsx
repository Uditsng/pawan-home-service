import { createClient } from "@/utils/supabase/server";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch Bookings for Metrics
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(title, category)')
    .gte('created_at', monthStart);

  const dailyBookings = bookings?.filter(b => b.created_at >= todayStart) || [];
  const weeklyBookings = bookings?.filter(b => b.created_at >= weekStart) || [];
  const monthlyBookings = bookings || [];

  const dailyGMV = dailyBookings.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const weeklyGMV = weeklyBookings.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const monthlyGMV = monthlyBookings.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

  const cancellationRate = monthlyBookings.length > 0 
    ? (monthlyBookings.filter(b => b.status === 'cancelled').length / monthlyBookings.length) * 100 
    : 0;

  const { count: activePartners } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'partner');

  const alerts = [];
  if (cancellationRate > 15) {
    alerts.push({ id: 1, type: 'critical', message: `High Cancellation Rate: ${cancellationRate.toFixed(1)}%`, icon: 'warning' });
  }

  const serviceCounts: Record<string, number> = {};
  monthlyBookings.forEach(b => {
    const title = b.services?.title || 'Unknown';
    serviceCounts[title] = (serviceCounts[title] || 0) + 1;
  });
  const topServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Alert System */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center gap-4 p-4 rounded-2xl bg-primary text-white shadow-ambient border border-white/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-linear-to-r from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="material-symbols-outlined text-secondary">{alert.icon}</span>
              <p className="text-sm font-bold tracking-tight relative z-10">{alert.message}</p>
              <button className="ml-auto text-[10px] font-black uppercase tracking-widest text-secondary hover:underline relative z-10">Resolve Now</button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Monthly GMV */}
        <div className="bg-primary p-8 rounded-[32px] text-white shadow-ambient relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-6">Total GMV (Monthly)</p>
          <h2 className="text-4xl font-bold font-headline tracking-tighter">₹{monthlyGMV.toLocaleString()}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg">+12.5%</span>
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Growth</span>
          </div>
        </div>

        {/* KPI: Active Bookings */}
        <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/20 shadow-sm hover:shadow-ambient transition-all group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6">Active Bookings</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-bold font-headline tracking-tighter text-primary">
              {monthlyBookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress').length}
            </h2>
            <span className="material-symbols-outlined text-secondary text-3xl opacity-20 group-hover:opacity-100 transition-opacity">calendar_month</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase tracking-widest">In Pipeline</p>
        </div>

        {/* KPI: Partner Fleet */}
        <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/20 shadow-sm hover:shadow-ambient transition-all group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6">Partner Fleet</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-bold font-headline tracking-tighter text-primary">{activePartners}</h2>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase tracking-widest">Operational</p>
        </div>

        {/* KPI: Success Rate */}
        <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/20 shadow-sm hover:shadow-ambient transition-all group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-6">Success Rate</p>
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-bold font-headline tracking-tighter text-primary">{(100 - cancellationRate).toFixed(1)}%</h2>
            <span className="material-symbols-outlined text-secondary text-3xl opacity-20 group-hover:opacity-100 transition-opacity">task_alt</span>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase tracking-widest">Platform Quality</p>
        </div>
      </div>

      {/* Business Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Distribution */}
        <div className="lg:col-span-2 glass-panel p-10 rounded-[40px] space-y-10 border border-outline-variant/20">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold tracking-tight text-primary font-headline">Revenue Intelligence</h3>
            <button className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center hover:bg-secondary transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-8">
                <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 group hover:bg-primary transition-all duration-500">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 group-hover:text-white/60">Platform Net (20%)</p>
                   <p className="text-3xl font-bold text-primary font-headline mt-2 group-hover:text-white">₹{(monthlyGMV * 0.2).toLocaleString()}</p>
                </div>
                <div className="p-6 rounded-[24px] bg-secondary/10 border border-secondary/20 group hover:bg-secondary transition-all duration-500">
                   <p className="text-[10px] font-black uppercase tracking-widest text-secondary/80 group-hover:text-primary/60">Partner Payouts (80%)</p>
                   <p className="text-3xl font-bold text-primary font-headline mt-2">₹{(monthlyGMV * 0.8).toLocaleString()}</p>
                </div>
             </div>

             <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Dominant Services</h4>
                <div className="space-y-5">
                   {topServices.map(([title, count], idx) => (
                     <div key={title} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black ${
                             idx === 0 ? 'bg-secondary text-primary' : 'bg-surface-container-high text-on-surface-variant'
                           }`}>{idx + 1}</span>
                           <span className="text-sm font-bold text-primary tracking-tight">{title}</span>
                        </div>
                        <span className="text-xs font-black text-on-surface-variant">{count} Volume</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Geographic Demand */}
        <div className="glass-panel p-10 rounded-[40px] border border-outline-variant/20 flex flex-col">
          <h3 className="text-2xl font-bold tracking-tight text-primary font-headline mb-8">Service Density</h3>
          <div className="space-y-8 flex-1">
             {[
               { city: 'Roorkee', val: 85, color: 'bg-primary' },
               { city: 'Chandigarh', val: 12, color: 'bg-primary/60' },
               { city: 'Haridwar', val: 3, color: 'bg-primary/30' }
             ].map(item => (
               <div key={item.city} className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                    <span>{item.city}</span>
                    <span>{item.val}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${item.val}%` }}></div>
                  </div>
               </div>
             ))}
          </div>

          <div className="mt-10 p-5 rounded-3xl bg-secondary/10 border border-secondary/10">
             <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
               <span className="material-symbols-outlined text-[16px]">insights</span> Ops Strategy
             </p>
             <p className="text-[11px] text-primary/80 mt-3 font-bold leading-relaxed">
               Chandigarh demand up <b>12%</b>. Suggest boosting partner density in central sectors.
             </p>
          </div>
        </div>
      </div>

      {/* Live Ops Ledger */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-ambient overflow-hidden">
        <div className="px-10 py-8 border-b border-outline-variant/10 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-bold text-primary font-headline tracking-tight">Live Ops Ledger</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-1.5 opacity-60">Most Recent Transactions</p>
           </div>
           <button className="px-5 py-2.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">Command View</button>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {monthlyBookings
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(booking => (
              <div key={booking.id} className="px-10 py-6 flex items-center gap-8 hover:bg-surface-container-low transition-colors group cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                  booking.status === 'completed' ? 'bg-secondary/10 text-secondary' : 
                  booking.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-primary/5 text-primary'
                }`}>
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {booking.status === 'completed' ? 'verified' : booking.status === 'cancelled' ? 'error' : 'schedule'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-primary truncate uppercase tracking-tighter">BK-{booking.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[11px] font-bold text-on-surface-variant/60 mt-1 truncate">{booking.services?.title} • {booking.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary font-headline tracking-tight">₹{Number(booking.total_amount).toLocaleString()}</p>
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">
                    {format(new Date(booking.created_at), 'HH:mm a')}
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/20 group-hover:text-secondary transition-colors">chevron_right</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
