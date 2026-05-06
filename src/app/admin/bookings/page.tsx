import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; city?: string }>;
}) {
  const supabase = await createClient();
  const { status, city } = await searchParams;

  let query = supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      total_amount,
      city,
      created_at,
      services:service_id (title),
      customer:customer_id (full_name, phone),
      partner:partner_id (full_name)
    `)
    .order("created_at", { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (city && city !== 'all') query = query.eq('city', city);

  const { data: bookings } = await query;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Ops Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Operations Command</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Real-time lifecycle tracking and manual command overrides.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar max-w-full">
             {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
               <button 
                 key={s}
                 className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                   (status || 'all') === s ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-on-surface-variant hover:text-primary'
                 }`}
               >
                 {s}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Bookings Ledger */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Operational ID</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Client / Zone</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Service Engine</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Deployment</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Lifecycle State</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 text-right">Volume</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {bookings?.map(booking => (
                <tr key={booking.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary font-mono tracking-tighter">BK-{booking.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1.5">{format(new Date(booking.created_at), 'MMM dd')}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{(booking.customer as any)?.full_name || 'Guest'}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">location_on</span> {booking.city}
                    </p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{(booking.services as any)?.title}</p>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 mt-1.5">
                      <span className="material-symbols-outlined text-sm">handshake</span> {(booking.partner as any)?.full_name || 'Unassigned'}
                    </p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-xs font-black text-primary tracking-tight">{booking.scheduled_date ? format(new Date(booking.scheduled_date), 'MMM dd, HH:mm') : 'Unscheduled'}</p>
                  </td>
                  <td className="px-10 py-8">
                    <Badge variant={
                      booking.status === 'pending' ? 'warning' :
                      booking.status === 'completed' ? 'success' :
                      booking.status === 'cancelled' ? 'danger' :
                      'primary'
                    }>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        booking.status === 'pending' ? 'bg-[#D97706] animate-pulse' :
                        booking.status === 'completed' ? 'bg-secondary' :
                        booking.status === 'cancelled' ? 'bg-red-500' : 'bg-primary animate-pulse'
                      }`}></span>
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="text-lg font-bold text-primary font-headline tracking-tighter">₹{Number(booking.total_amount).toLocaleString()}</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">farsight_2</span>
                    </Button>
                  </td>
                </tr>
              ))}
              {(!bookings || bookings.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-10 py-20 text-center text-on-surface-variant/40 text-sm font-black uppercase tracking-widest">No operational data matches filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
