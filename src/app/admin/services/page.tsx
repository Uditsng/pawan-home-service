import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function AdminServicesPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('category', { ascending: true });

  const categories = services?.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, any[]>) || {};

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary font-headline">Service Catalog</h1>
          <p className="text-on-surface-variant font-medium mt-1.5 opacity-60 italic">Configure hierarchy, dynamic pricing engine, and platform requirements.</p>
        </div>
        <Link 
          href="/admin/services/create"
          className="px-8 py-4 bg-primary text-white rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span> New Service
        </Link>
      </div>

      <div className="space-y-12">
        {Object.entries(categories as Record<string, any[]>).map(([category, items]) => (
          <div key={category} className="space-y-6">
            <div className="flex items-center gap-6 px-4">
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">{category}</h3>
               <div className="flex-1 h-px bg-outline-variant/20"></div>
               <span className="text-[10px] font-black text-secondary bg-secondary/10 px-3 py-1 rounded-full uppercase tracking-widest">{items.length} Units</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map(service => (
                <Card key={service.id} variant="solid" className="group relative overflow-hidden flex flex-col p-8 hover:shadow-ambient transition-all">
                   {!service.is_active && (
                     <Badge variant="danger" className="absolute top-0 right-0 rotate-45 translate-x-6 translate-y-4 px-6 py-1 rounded-none shadow-sm">Draft</Badge>
                   )}
                   
                   <div className="flex justify-between items-start mb-8">
                      <div className="w-16 h-16 rounded-[24px] bg-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/5">
                         <span className="material-symbols-outlined text-3xl">
                           {category === 'cleaning' ? 'mop' : category === 'plumbing' ? 'plumbing' : 'handyman'}
                         </span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <Link 
                          href={`/admin/services/${service.id}/edit`}
                          className="w-10 h-10 rounded-2xl bg-surface-container text-on-surface-variant hover:bg-primary hover:text-white flex items-center justify-center transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </Link>
                      </div>
                   </div>

                   <h4 className="text-xl font-bold text-primary tracking-tight font-headline uppercase leading-tight">{service.title}</h4>
                   <p className="text-xs font-medium text-on-surface-variant opacity-60 mt-2.5 line-clamp-2 leading-relaxed">{service.description || 'No description provided.'}</p>
                   
                   <div className="mt-auto pt-8 border-t border-outline-variant/10 flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Base Deployment</p>
                        <p className="text-2xl font-bold text-primary font-headline mt-1">₹{Number(service.base_price).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Duration</p>
                        <p className="text-xs font-black text-secondary uppercase tracking-tight">~ 2.5 Hrs</p>
                      </div>
                    </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
