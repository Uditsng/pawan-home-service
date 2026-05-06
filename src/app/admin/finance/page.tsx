import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";

export default async function AdminFinancePage() {
  const supabase = await createClient();

  // Fetch successful bookings for financial reporting
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      total_amount,
      created_at,
      status,
      customer:customer_id (full_name),
      partner:partner_id (full_name)
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const totalRevenue = bookings?.reduce((acc, b) => acc + Number(b.total_amount || 0), 0) || 0;
  const platformCommission = totalRevenue * 0.2;
  const partnerPayouts = totalRevenue * 0.8;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Finance Ledger</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Reconcile payments, automated payouts, and platform net earnings.</p>
        </div>
        <button className="px-6 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:bg-secondary transition-all shadow-sm">
          <span className="material-symbols-outlined text-lg">cloud_download</span> Export Ledger
        </button>
      </div>

      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="bg-primary p-10 rounded-[40px] text-white shadow-ambient relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-32 h-32 bg-secondary/10 rounded-bl-[80px] blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Gross Revenue (GMV)</p>
           <h2 className="text-4xl font-bold mt-6 font-headline tracking-tighter text-secondary">₹{totalRevenue.toLocaleString()}</h2>
           <p className="text-[10px] font-bold text-white/30 mt-3 uppercase tracking-widest">Lifetime Settled Volume</p>
        </div>
        
        <div className="bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/20 shadow-sm relative group overflow-hidden">
           <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Platform Net (20%)</p>
           <h2 className="text-4xl font-bold mt-6 font-headline tracking-tighter text-primary">₹{platformCommission.toLocaleString()}</h2>
           <div className="flex items-center gap-2 mt-3">
             <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
             <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Net Profitability</span>
           </div>
        </div>

        <div className="bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/20 shadow-sm relative group overflow-hidden">
           <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Partner Payouts (80%)</p>
           <h2 className="text-4xl font-bold mt-6 font-headline tracking-tighter text-primary">₹{partnerPayouts.toLocaleString()}</h2>
           <button className="text-[10px] font-black text-secondary hover:underline uppercase tracking-widest mt-3 flex items-center gap-1.5">
             <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span> Initiate Batch Settlement
           </button>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-ambient overflow-hidden">
        <div className="px-10 py-8 border-b border-outline-variant/10 flex justify-between items-center">
           <h3 className="text-xl font-bold text-primary font-headline tracking-tight">Financial Ledger</h3>
           <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary"></span> Settled</span>
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Pending</span>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">TX Timestamp</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Counterparties</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 text-right">Gross</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 text-right">Commission</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 text-right">Partner Share</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {bookings?.map(tx => (
                <tr key={tx.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary uppercase tracking-tighter">{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase font-mono tracking-tighter mt-1.5">TX-{tx.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">{(tx.customer as any)?.full_name}</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">engineering</span> {(tx.partner as any)?.full_name}
                    </p>
                  </td>
                  <td className="px-10 py-8 text-right font-black text-primary text-lg tracking-tighter">
                    ₹{Number(tx.total_amount).toLocaleString()}
                  </td>
                  <td className="px-10 py-8 text-right text-sm font-bold text-on-surface-variant/40">
                    - ₹{(Number(tx.total_amount) * 0.2).toLocaleString()}
                  </td>
                  <td className="px-10 py-8 text-right text-lg font-bold text-secondary tracking-tighter">
                    ₹{(Number(tx.total_amount) * 0.8).toLocaleString()}
                  </td>
                  <td className="px-10 py-8">
                     <span className="px-3.5 py-2 rounded-xl bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest border border-secondary/20">Settled</span>
                  </td>
                </tr>
              ))}
              {(!bookings || bookings.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center text-on-surface-variant/40 text-sm font-black uppercase tracking-widest">No financial transactions recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
