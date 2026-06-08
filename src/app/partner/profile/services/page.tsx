import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PartnerHeader from "@/components/PartnerHeader";

export default async function PartnerServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all services to show active/inactive state
  const { data: allServices } = await supabase
    .from('services')
    .select('id, title, category')
    .order('category', { ascending: true });

  // Fetch partner's active services
  const { data: partnerServices } = await supabase
    .from('partner_services')
    .select('service_id')
    .eq('partner_id', user.id);

  const activeServiceIds = new Set((partnerServices || []).map(ps => ps.service_id));

  // Fetch partner's service areas (city column stores the locality now)
  const { data: partnerAreas } = await supabase
    .from('partner_service_areas')
    .select('id, pincode, city')
    .eq('partner_id', user.id);

  const getServiceIcon = (category: string) => {
    switch (category) {
      case 'cleaning': return '🧹';
      case 'plumbing': return '🔧';
      case 'electrician': return '⚡';
      case 'pest_control': return '🐛';
      default: return <span className="material-symbols-outlined">home_repair_service</span>;
    }
  };

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen flex flex-col font-sans pb-24">
      <PartnerHeader />
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-6 space-y-6">
        
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
            Professional Details
          </h2>

          {/* Services Offered Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-[#1c2438] text-[15px]">Services Offered</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {allServices?.map((service) => {
                const isActive = activeServiceIds.has(service.id);
                
                // Hide inactive services if they have too many, or show them? 
                // The user requested to see [Inactive] state. So we render them.
                // Wait, if there are many services, maybe only show active and a few inactive?
                // Let's just show all for now.
                return (
                  <div key={service.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[20px] ${!isActive && 'opacity-50 grayscale'}`}>
                        {getServiceIcon(service.category)}
                      </span>
                      <span className={`font-semibold text-[14px] ${isActive ? 'text-[#1c2438]' : 'text-slate-400'}`}>
                        {service.title}
                      </span>
                    </div>
                    {isActive ? (
                      <span className="bg-success/10 text-success text-[10px] font-extrabold px-2 py-1 rounded-[6px] uppercase tracking-wide flex items-center gap-1">
                        Active ✓
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-extrabold px-2 py-1 rounded-[6px] uppercase tracking-wide">
                        Inactive
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-semibold">
              ℹ️ To update your assigned services, please contact the administration team.
            </div>
          </div>

          {/* Service Areas Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-[#1c2438] text-[15px]">Service Areas</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {partnerAreas && partnerAreas.length > 0 ? (
                partnerAreas.map((area) => (
                  <div key={area.id} className="p-4 md:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[20px]">📍</span>
                      <span className="font-semibold text-[14px] text-[#1c2438]">
                        {area.city || "Unknown Area"} <span className="text-slate-400 text-xs font-medium ml-1">({area.pincode})</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 font-medium text-sm">
                  No service areas added yet.
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-semibold">
              ℹ️ To update your service pincodes, please contact the administration team.
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
