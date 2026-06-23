import { createClient } from "@/utils/supabase/server";
import { PartnersConsole } from "./PartnersConsole";

export interface PartnerBooking {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  scheduled_date: string | null;
  pincode: string | null;
  city: string | null;
  services: {
    title: string;
    category: string;
  } | null;
  customer: {
    full_name: string | null;
  } | null;
}

export interface PartnerReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  bookings: {
    services: {
      title: string;
    } | null;
  } | null;
  customer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PartnerServiceArea {
  pincode: string;
  city: string;
}

export interface SerializedPartner {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  status: 'active' | 'offline' | 'busy' | 'suspended';
  service_tier: 'premium' | 'standard';
  kyc_status: 'approved' | 'rejected' | 'pending';
  kyc_rejection_reason: string | null;
  kyc_documents: Record<string, unknown> | null;
  rating_avg: number;
  jobs_done: number;
  jobs_cancelled: number;
  reliability_rate: number;
  skills: string[];
  categories: string[];
  cities: string[];
  pincodes: string[];
  bookings: PartnerBooking[];
  reviews: PartnerReview[];
  bookings_count: number;
  reviews_count: number;
  internal_note?: string | null;
  risk_trigger?: string | null;
  service_areas?: PartnerServiceArea[];
}

interface RawPartnerProfile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  status?: 'active' | 'offline' | 'busy' | 'suspended' | null;
  service_tier?: 'premium' | 'standard' | null;
  kyc_status?: 'approved' | 'rejected' | 'pending' | null;
  kyc_rejection_reason?: string | null;
  kyc_documents?: Record<string, unknown> | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  jobs_offered_count?: number | null;
  jobs_accepted_count?: number | null;
  jobs_cancelled_count?: number | null;
  acceptance_rate?: number | null;
  cancellation_rate?: number | null;
  is_available?: boolean | null;
  internal_note?: string | null;
  risk_trigger?: string | null;
  partner_services?: {
    services: {
      id: string;
      title: string;
      category: string;
    } | null;
  }[] | null;
  partner_service_areas?: {
    id: string;
    pincode: string;
    city: string;
  }[] | null;
  bookings?: {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    scheduled_date: string | null;
    pincode: string | null;
    city: string | null;
    services: {
      title: string;
      category: string;
    } | null;
    customer: {
      full_name: string | null;
    } | null;
  }[] | null;
  reviews?: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    bookings: {
      services: {
        title: string;
      } | null;
    } | null;
    customer: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[] | null;
}

interface RawServiceQueryItem {
  id: string;
  title: string;
  subcategories: {
    subcategory_name: string;
    categories: {
      category_name: string;
    } | { category_name: string }[] | null;
  } | {
    subcategory_name: string;
    categories: {
      category_name: string;
    } | { category_name: string }[] | null;
  }[] | null;
}

export default async function AdminPartnersPage() {
  const supabase = await createClient();

  let partners: RawPartnerProfile[] = [];
  let isSchemaError = false;

  // Start queries in parallel: profiles simplified (no bookings or reviews joined) and active services
  const profilesPromise = supabase
    .from('profiles')
    .select(`
      *,
      partner_services:partner_services(
        services:services(id, title, category)
      ),
      partner_service_areas:partner_service_areas(
        id,
        pincode,
        city
      )
    `)
    .eq('role', 'partner')
    .limit(1000);

  const servicesPromise = supabase
    .from('services')
    .select(`
      id,
      title,
      subcategories (
        subcategory_name,
        categories (
          category_name
        )
      )
    `)
    .eq('is_active', true);

  const [profilesRes, servicesRes] = await Promise.all([profilesPromise, servicesPromise]);
  const { data, error } = profilesRes;
  const { data: allServicesData } = servicesRes;

  if (error) {
    // Catch missing columns error (code 42703 or message check) and fallback
    if (error.code === '42703' || error.message?.includes('service_tier') || error.message?.includes('kyc_status')) {
      isSchemaError = true;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          status,
          avatar_url,
          rating_avg,
          rating_count,
          jobs_offered_count,
          jobs_accepted_count,
          jobs_cancelled_count,
          acceptance_rate,
          cancellation_rate,
          is_available,
          partner_services:partner_services(
            services:services(id, title, category)
          ),
          partner_service_areas:partner_service_areas(
            id,
            pincode,
            city
          )
        `)
        .eq('role', 'partner')
        .limit(1000);

      if (!fallbackError && fallbackData) {
        partners = (fallbackData as unknown as RawPartnerProfile[]).map(p => ({
          ...p,
          service_tier: 'standard',
          kyc_status: 'pending',
          kyc_rejection_reason: null,
          kyc_documents: null
        }));
      } else {
        console.error("Fallback query also failed:", fallbackError);
      }
    } else {
      console.error("Query error:", error);
    }
  } else if (data) {
    partners = data as unknown as RawPartnerProfile[];
  }

  // Preprocess and safely type partners list
  const processedPartners: SerializedPartner[] = (partners || []).map((p) => {
    // Flatten skills and categories
    const skills = p.partner_services?.map((ps) => ps.services?.title).filter((t): t is string => typeof t === "string") || [];
    const serviceCategories = p.partner_services?.map((ps) => ps.services?.category).filter((t): t is string => typeof t === "string") || [];
    const uniqueCategories = Array.from(new Set(serviceCategories));

    // Extract coverage locations
    const citiesCovered = p.partner_service_areas?.map((sa) => sa.city).filter((c): c is string => typeof c === "string") || [];
    const uniqueCities = Array.from(new Set(citiesCovered));
    const pincodesCovered = p.partner_service_areas?.map((sa) => sa.pincode).filter((pc): pc is string => typeof pc === "string") || [];

    const serviceAreas: PartnerServiceArea[] = p.partner_service_areas?.map((sa) => ({
      pincode: sa.pincode,
      city: sa.city
    })) || [];

    // Calculate reliable rates
    const accepted = p.jobs_accepted_count || 0;
    const offered = p.jobs_offered_count || 0;
    const reliabilityRate = offered > 0 ? Math.round((accepted / offered) * 100) : 98;

    return {
      id: p.id,
      full_name: p.full_name || "Unknown Professional",
      email: p.email || "No email",
      phone: p.phone || "No phone",
      avatar_url: p.avatar_url || null,
      status: p.status || 'offline',
      service_tier: p.service_tier || 'standard',
      kyc_status: p.kyc_status || 'pending',
      kyc_rejection_reason: p.kyc_rejection_reason || null,
      kyc_documents: p.kyc_documents || null,
      rating_avg: p.rating_avg || 4.8,
      jobs_done: accepted,
      jobs_cancelled: p.jobs_cancelled_count || 0,
      reliability_rate: reliabilityRate,
      skills,
      categories: uniqueCategories,
      cities: uniqueCities,
      pincodes: pincodesCovered,
      bookings: [], // Load on-demand
      reviews: [], // Load on-demand
      bookings_count: p.jobs_offered_count || 0,
      reviews_count: p.rating_count || 0,
      internal_note: p.internal_note || null,
      risk_trigger: p.risk_trigger || null,
      service_areas: serviceAreas
    };
  });

  // Fetch all active services for skills mapping
  const allServices = ((allServicesData || []) as unknown as RawServiceQueryItem[]).map((s) => {
    const subcat = Array.isArray(s.subcategories) ? s.subcategories[0] : s.subcategories;
    const cat = subcat ? (Array.isArray(subcat.categories) ? subcat.categories[0] : subcat.categories) : null;
    return {
      id: s.id,
      title: s.title,
      category_name: cat?.category_name || "General Services"
    };
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Technicians</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Manage technician profiles, assignments, and onboarding.</p>
        </div>
      </div>

      {/* Graceful Database Schema Warning Banner */}
      {isSchemaError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 animate-pulse-slow">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-700">warning</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
              <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                The profiles table is missing the columns <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">service_tier</code>, <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">kyc_status</code>, <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">kyc_rejection_reason</code>, and <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">kyc_documents</code>. Please run the migration query inside your Supabase Dashboard SQL editor to unlock compliance flows.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl border border-amber-500/25 transition-all text-center">
            Schema Pending
          </div>
        </div>
      )}

      {/* Interactive Fleet Control Dashboard Console */}
      <PartnersConsole 
        initialPartners={processedPartners} 
        allServices={allServices}
      />
    </div>
  );
}
