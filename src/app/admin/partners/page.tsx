import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default async function AdminPartnersPage() {
  const supabase = await createClient();

  // Fetch partners with stats
  const { data: partners } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'partner');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Fleet Control</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Quality assurance, fulfillment metrics, and partner verification.</p>
        </div>
        <Button variant="primary" size="lg" className="shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xs uppercase tracking-widest gap-3 rounded-[20px] px-8 py-4">
          <span className="material-symbols-outlined text-lg">person_add</span> Onboard Partner
        </Button>
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-primary p-8 rounded-[32px] text-white shadow-ambient relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-secondary/10 rounded-tl-[64px]"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Fleet Capacity</p>
            <h2 className="text-3xl font-bold font-headline mt-4">{partners?.length || 0} Professionals</h2>
            <div className="mt-4 flex items-center gap-2">
               <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Across 4 Cities</span>
            </div>
         </div>
         <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/20 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Avg. Fleet Rating</p>
            <div className="flex items-end gap-3 mt-4">
               <h2 className="text-3xl font-bold text-primary font-headline">4.8</h2>
               <div className="flex gap-0.5 mb-1.5 text-secondary">
                  {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-[14px]">star</span>)}
               </div>
            </div>
         </div>
         <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/20 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Avg. Acceptance Rate</p>
            <h2 className="text-3xl font-bold text-primary font-headline mt-4">92.4%</h2>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-2 flex items-center gap-1">
               <span className="material-symbols-outlined text-xs">trending_up</span> Optimized
            </p>
         </div>
      </div>

      {/* Partner Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {partners?.map(partner => (
          <div key={partner.id} className="bg-surface-container-lowest rounded-[40px] border border-outline-variant/20 shadow-sm hover:shadow-ambient transition-all group overflow-hidden">
            <div className="p-8 flex flex-col sm:flex-row gap-8">
               <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-[32px] bg-primary/5 flex items-center justify-center text-primary font-black text-2xl border border-primary/5 shadow-inner">
                     {partner.full_name?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center border-4 border-surface shadow-lg">
                     <span className="material-symbols-outlined text-primary text-xl">verified</span>
                  </div>
               </div>

               <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-xl font-bold text-primary tracking-tight font-headline uppercase">{partner.full_name}</h3>
                        <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1.5">Premium Partner • {partner.city || 'Roorkee'}</p>
                     </div>
                     <Badge variant="success">Active</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-6 border-t border-outline-variant/10">
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Rating</p>
                        <p className="text-base font-bold text-primary mt-1">4.92</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Jobs</p>
                        <p className="text-base font-bold text-primary mt-1">124</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Reliability</p>
                        <p className="text-base font-bold text-primary mt-1">98%</p>
                     </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <Button variant="primary" className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02]">Command Profile</Button>
                     <Button variant="ghost" size="icon" className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-secondary hover:text-primary transition-all shadow-sm">
                        <span className="material-symbols-outlined text-xl">more_horiz</span>
                     </Button>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
