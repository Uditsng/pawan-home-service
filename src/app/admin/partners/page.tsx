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

export interface PendingBooking {
  id: string;
  status: string;
  created_at: string;
  pincode: string | null;
  city: string | null;
  services: {
    title: string;
  } | null;
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
  kyc_documents: any | null;
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
}

export default async function AdminPartnersPage() {
  const supabase = await createClient();

  let partners: any[] = [];
  let isSchemaError = false;

  // Fetch pending bookings for the emergency dispatch feature
  const { data: pendingBookingsData } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      created_at,
      pincode,
      city,
      services:services(title)
    `)
    .eq('status', 'pending')
    .limit(1000);

  const pendingBookings: PendingBooking[] = (pendingBookingsData || []).map((b: any) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    pincode: b.pincode || null,
    city: b.city || null,
    services: b.services ? {
      title: b.services.title || "Home Service"
    } : null
  }));

  // Try fetching profiles joined with services, service areas, bookings, and reviews
  const { data, error } = await supabase
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
      ),
      bookings:bookings!bookings_partner_id_fkey(
        id,
        status,
        total_amount,
        created_at,
        scheduled_date,
        pincode,
        city,
        services:services(title, category),
        customer:profiles!bookings_customer_id_fkey(full_name)
      ),
      reviews:reviews!reviews_partner_id_fkey(
        id,
        rating,
        comment,
        created_at,
        bookings:bookings!reviews_booking_id_fkey(
          services:services(title)
        ),
        customer:profiles!reviews_customer_id_fkey(full_name, avatar_url)
      )
    `)
    .eq('role', 'partner')
    .limit(1000);

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
          ),
          bookings:bookings!bookings_partner_id_fkey(
            id,
            status,
            total_amount,
            created_at,
            scheduled_date,
            pincode,
            city,
            services:services(title, category),
            customer:profiles!bookings_customer_id_fkey(full_name)
          ),
          reviews:reviews!reviews_partner_id_fkey(
            id,
            rating,
            comment,
            created_at,
            bookings:bookings!reviews_booking_id_fkey(
              services:services(title)
            ),
            customer:profiles!reviews_customer_id_fkey(full_name, avatar_url)
          )
        `)
        .eq('role', 'partner')
        .limit(1000);

      if (!fallbackError && fallbackData) {
        partners = fallbackData.map(p => ({
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
    partners = data;
  }

  // Preprocess and safely type partners list
  const processedPartners: SerializedPartner[] = (partners || []).map((p: any) => {
    // Flatten skills and categories
    const skills = p.partner_services?.map((ps: any) => ps.services?.title).filter(Boolean) || [];
    const serviceCategories = p.partner_services?.map((ps: any) => ps.services?.category).filter(Boolean) || [];
    const uniqueCategories = Array.from(new Set(serviceCategories)) as string[];

    // Extract coverage locations
    const citiesCovered = p.partner_service_areas?.map((sa: any) => sa.city).filter(Boolean) || [];
    const uniqueCities = Array.from(new Set(citiesCovered)) as string[];
    const pincodesCovered = p.partner_service_areas?.map((sa: any) => sa.pincode).filter(Boolean) || [];

    // Flatten bookings and reviews safely
    const bookings: PartnerBooking[] = (p.bookings || []).map((b: any) => ({
      id: b.id,
      status: b.status,
      total_amount: Number(b.total_amount || 0),
      created_at: b.created_at,
      scheduled_date: b.scheduled_date || null,
      pincode: b.pincode || null,
      city: b.city || null,
      services: b.services ? {
        title: b.services.title || "Home Service",
        category: b.services.category || ""
      } : null,
      customer: b.customer ? {
        full_name: b.customer.full_name || "Unknown Customer"
      } : null
    }));

    const reviews: PartnerReview[] = (p.reviews || []).map((r: any) => ({
      id: r.id,
      rating: Number(r.rating || 5),
      comment: r.comment || null,
      created_at: r.created_at,
      bookings: r.bookings ? {
        services: r.bookings.services ? {
          title: r.bookings.services.title || "Home Service"
        } : null
      } : null,
      customer: r.customer ? {
        full_name: r.customer.full_name || "Anonymous",
        avatar_url: r.customer.avatar_url || null
      } : null
    }));

    // Calculate reliable rates
    const accepted = p.jobs_accepted_count || bookings.filter(b => b.status !== 'cancelled' && b.status !== 'pending').length;
    const offered = p.jobs_offered_count || bookings.length;
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
      jobs_done: accepted || p.jobs_accepted_count || 0,
      jobs_cancelled: p.jobs_cancelled_count || bookings.filter(b => b.status === 'cancelled').length || 0,
      reliability_rate: reliabilityRate,
      skills,
      categories: uniqueCategories,
      cities: uniqueCities,
      pincodes: pincodesCovered,
      bookings,
      reviews
    };
  });

  // Fetch all active services for skills mapping
  const { data: allServicesData } = await supabase
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

  const allServices = (allServicesData || []).map((s: any) => {
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
                The profiles table is missing the columns <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">service_tier</code>, <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold font-black text-[11px]">kyc_status</code>, <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold font-black text-[11px]">kyc_rejection_reason</code>, and <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold font-black text-[11px]">kyc_documents</code>. Please run the migration query inside your Supabase Dashboard SQL editor to unlock compliance flows.
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
        pendingBookings={pendingBookings} 
        allServices={allServices}
      />
    </div>
  );
}
