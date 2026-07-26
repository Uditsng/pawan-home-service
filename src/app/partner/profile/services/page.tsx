import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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

  // ─── Fetch services, partner services, and partner areas in parallel ───
  const [servicesResult, partnerServicesResult, partnerAreasResult] = await Promise.all([
    supabase
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
      .eq('is_active', true)
      .eq('status', 'published'),
    supabase
      .from('partner_services')
      .select('service_id')
      .eq('partner_id', user.id),
    supabase
      .from('partner_service_areas')
      .select('id, pincode, city')
      .eq('partner_id', user.id)
  ]);

  const services = servicesResult.data;
  const partnerServices = partnerServicesResult.data;
  const partnerAreas = partnerAreasResult.data;

  const rawServices = (services || []) as unknown as RawService[];

  const availableServices = rawServices.map((s) => ({
    id: s.id,
    title: s.title,
    subcategoryName: s.subcategories?.subcategory_name || "General",
    categoryName: s.subcategories?.categories?.category_name || "Other",
    iconName: s.subcategories?.icon_name || "sparkles",
  }));

  const activeServiceIds = (partnerServices || []).map(ps => ps.service_id);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body pb-24 lg:pb-12">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">

        <div>
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 ml-1">
            Professional Skill & Service Configuration
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
