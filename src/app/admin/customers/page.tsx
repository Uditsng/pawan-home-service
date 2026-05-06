import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  // Fetch profiles joined with booking stats
  const { data: customers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      created_at,
      bookings:bookings(count),
      total_spent:bookings(total_amount),
      cancelled_bookings:bookings(status)
    `)
    .eq('role', 'customer');

  const processedCustomers = customers?.map(c => {
    const totalBookings = (c.bookings as { count: number }[])?.[0]?.count || 0;
    const spent = (c.total_spent as { total_amount: number }[])?.reduce((acc, b) => acc + Number(b.total_amount || 0), 0) || 0;
    const cancels = (c.cancelled_bookings as { status: string }[])?.filter(b => b.status === 'cancelled').length || 0;
    const cancelRate = totalBookings > 0 ? (cancels / totalBookings) * 100 : 0;

    return {
      ...c,
      totalBookings,
      spent,
      cancelRate,
      riskLevel: cancelRate > 30 ? 'High' : cancelRate > 15 ? 'Medium' : 'Low'
    };
  }) || [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Customer CRM</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Lifecycle value, spend analytics, and fraud risk monitoring.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-surface-container p-1 rounded-2xl border border-outline-variant/10 shadow-inner">
              <Button variant="primary" className="px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">All Users</Button>
              <Button variant="ghost" className="px-5 py-2 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">High Value</Button>
           </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/20 shadow-sm relative overflow-hidden group">
           <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Avg. Life-Time Value</p>
           <h2 className="text-3xl font-bold text-primary font-headline mt-4">₹{(processedCustomers.reduce((acc, c) => acc + c.spent, 0) / (processedCustomers.length || 1)).toLocaleString()}</h2>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/20 shadow-sm">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Platform Stickiness</p>
           <h2 className="text-3xl font-bold text-primary font-headline mt-4">2.4 Bookings/User</h2>
        </div>
        <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/20 shadow-sm">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Retention Rate</p>
           <h2 className="text-3xl font-bold text-secondary font-headline mt-4">74.2%</h2>
        </div>
      </div>

      {/* Customer Ledger */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Customer Details</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Operational KPIs</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">LTV / Spend</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Risk Flag</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {processedCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs border border-primary/5">
                        {customer.full_name?.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary tracking-tight uppercase">{customer.full_name}</p>
                        <p className="text-[11px] font-bold text-on-surface-variant opacity-60 mt-1">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary">{customer.totalBookings} Jobs</p>
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mt-1.5">Last: {format(new Date(customer.created_at), 'MMM dd')}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-lg font-bold text-primary font-headline">₹{customer.spent.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1">High-Value Tier</p>
                  </td>
                  <td className="px-10 py-8">
                    <Badge variant={
                      customer.riskLevel === 'High' ? 'danger' :
                      customer.riskLevel === 'Medium' ? 'warning' :
                      'success'
                    }>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        customer.riskLevel === 'High' ? 'bg-red-500 animate-pulse' :
                        customer.riskLevel === 'Medium' ? 'bg-[#D97706]' : 'bg-secondary'
                      }`}></span>
                      {customer.riskLevel} Risk
                    </Badge>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
