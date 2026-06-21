import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PartnerHeader from "@/components/PartnerHeader";
import EditServiceAreasForm from "./EditServiceAreasForm";
import EditServicesForm from "./EditServicesForm";

interface RawService {
  id: string;
  title: string;
  subcategories: {
    subcategory_name: string;
    icon_name: string;
    categories: {
      category_name: string;
    } | null;
  } | null;
}

export default async function PartnerServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch partner status for header toggle
  const { data: profileData } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user!.id)
    .single();

  const partnerStatus = profileData?.status ?? 'offline';

  // Fetch all active services with subcategories and categories
  const { data: services } = await supabase
    .from('services')
    .select(`
      id,
      title,
      subcategory_id,
      subcategories (
        id,
        subcategory_name,
        icon_name,
        categories (
          id,
          category_name
        )
      )
    `)
    .eq('is_active', true);

  const rawServices = (services || []) as unknown as RawService[];

  const availableServices = rawServices.map((s) => ({
    id: s.id,
    title: s.title,
    subcategoryName: s.subcategories?.subcategory_name || "General",
    categoryName: s.subcategories?.categories?.category_name || "Other",
    iconName: s.subcategories?.icon_name || "home_repair_service",
  }));

  // Fetch partner's active services
  const { data: partnerServices } = await supabase
    .from('partner_services')
    .select('service_id')
    .eq('partner_id', user.id);

  const activeServiceIds = (partnerServices || []).map(ps => ps.service_id);

  // Fetch partner's service areas (city column stores the locality now)
  const { data: partnerAreas } = await supabase
    .from('partner_service_areas')
    .select('id, pincode, city')
    .eq('partner_id', user.id);

  return (
    <div className="bg-[#f5f6f8] text-on-background min-h-screen flex flex-col font-sans pb-24">
      <PartnerHeader initialStatus={partnerStatus} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-5 pt-6 space-y-6">

        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
            Professional Details
          </h2>

          {/* Services Offered Section */}
          <EditServicesForm
            allServices={availableServices}
            initialSelectedServices={activeServiceIds}
          />

          {/* Service Areas Section */}
          <EditServiceAreasForm initialAreas={
            (partnerAreas || []).map(area => ({
              pincode: area.pincode,
              locality: area.city || "",
              city: area.city || ""
            }))
          } />
        </div>

      </main>
    </div>
  );
}
