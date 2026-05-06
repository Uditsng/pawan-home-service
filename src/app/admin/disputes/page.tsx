import { createClient } from "@/utils/supabase/server";

export default async function AdminDisputesPage() {
  

  // Simulated disputes (in a real app, fetch from 'tickets' or 'disputes' table)
  const disputes = [
    { 
      id: 'DISP-1002', 
      bookingId: 'BK-552', 
      customer: 'Rahul Verma', 
      partner: 'Deepak Kumar', 
      reason: 'Partial service completion', 
      status: 'open', 
      priority: 'high',
      created_at: '2026-05-01T10:00:00Z'
    },
    { 
      id: 'DISP-1001', 
      bookingId: 'BK-491', 
      customer: 'Anjali Sharma', 
      partner: 'Sunil Singh', 
      reason: 'Late arrival / Unprofessional behavior', 
      status: 'resolved', 
      priority: 'medium',
      created_at: '2026-04-28T14:30:00Z'
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Dispute Resolution</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Conflict moderation, refund arbitration, and quality enforcement.</p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20 shadow-sm">
           <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-primary text-white shadow-lg shadow-primary/20 transition-all">Open Tickets</button>
           <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all">Archived</button>
        </div>
      </div>

      {/* Case Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/20 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[64px] transition-transform group-hover:scale-110"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Mean Resolution</p>
          <h2 className="text-3xl font-bold text-primary font-headline mt-6">4.2 Hours</h2>
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Leading Sector
          </span>
        </div>
        <div className="bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/20 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Dominant Conflict</p>
          <h2 className="text-3xl font-bold text-primary font-headline mt-6">Quality</h2>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-3">Affecting 12% of jobs</span>
        </div>
        <div className="bg-surface-container-lowest p-10 rounded-[40px] border border-outline-variant/20 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Platform Score</p>
          <h2 className="text-3xl font-bold text-secondary font-headline mt-6">98.5%</h2>
          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-3">Resolution Rate</span>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Incident Code</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Counterparties</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Conflict Narrative</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Priority</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50">State</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {disputes.map(ticket => (
                <tr key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary font-mono tracking-tighter">{ticket.id}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1.5">Booking {ticket.bookingId}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">C: {ticket.customer}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1.5">P: {ticket.partner}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="text-sm font-bold text-primary tracking-tight leading-snug max-w-xs">{ticket.reason}</p>
                    <p className="text-[10px] font-black text-on-surface-variant/30 mt-2 uppercase tracking-widest">Logged 2h ago</p>
                  </td>
                  <td className="px-10 py-8">
                     <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                       ticket.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                     }`}>
                       {ticket.priority} Priority
                     </span>
                  </td>
                  <td className="px-10 py-8">
                     <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                       ticket.status === 'open' ? 'bg-amber-50 text-amber-700' : 'bg-secondary/10 text-secondary'
                     }`}>
                       <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-amber-500 animate-pulse' : 'bg-secondary'}`}></span>
                       {ticket.status}
                     </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20 opacity-0 group-hover:opacity-100">Arbritrate</button>
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
