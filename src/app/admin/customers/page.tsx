import { createClient } from "@/utils/supabase/server";
import { CustomerCRM } from "./CustomerCRM";

interface RawCustomerBooking {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  services: {
    title: string;
  } | null;
}

interface RawCustomerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  status: string | null;
  avatar_url: string | null;
  internal_note: string | null;
  risk_trigger: string | null;
  bookings: RawCustomerBooking[] | null;
}

export default async function AdminCustomersPage() {
  const supabase = await createClient();

  let customers: RawCustomerProfile[] = [];
  let isSchemaError = false;

  // Try fetching profiles joined with bookings and services, including the new CRM fields
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      created_at,
      status,
      avatar_url,
      internal_note,
      risk_trigger,
      bookings:bookings!bookings_customer_id_fkey(
        id,
        status,
        total_amount,
        created_at,
        services:services(title)
      )
    `)
    .eq('role', 'customer')
    .limit(1000);

  if (error) {
    // If column doesn't exist, gracefully fallback without crm-specific columns
    if (error.code === '42703' || error.message?.includes('internal_note') || error.message?.includes('risk_trigger')) {
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
          bookings:bookings!bookings_customer_id_fkey(
            id,
            status,
            total_amount,
            created_at,
            services:services(title)
          )
        `)
        .eq('role', 'customer')
        .limit(1000);

      if (!fallbackError && fallbackData) {
        customers = (fallbackData as unknown as RawCustomerProfile[]).map(c => ({
          ...c,
          internal_note: null,
          risk_trigger: null
        }));
      } else {
        console.error("Fallback query also failed:", fallbackError);
      }
    } else {
      console.error("Query error:", error);
    }
  } else if (data) {
    customers = data as unknown as RawCustomerProfile[];
  }

  // Pre-calculate metrics and risk categories for each customer
  const processedCustomers = customers.map(c => {
    const totalBookings = c.bookings?.length || 0;
    const spent = c.bookings?.reduce((acc: number, b: RawCustomerBooking) => acc + Number(b.total_amount || 0), 0) || 0;
    const cancels = c.bookings?.filter((b: RawCustomerBooking) => b.status === 'cancelled').length || 0;
    const cancelRate = totalBookings > 0 ? (cancels / totalBookings) * 100 : 0;

    return {
      ...c,
      status: (c.status || 'active') as 'active' | 'suspended' | 'flagged',
      bookings: c.bookings || [],
      totalBookings,
      spent,
      cancelRate,
      riskLevel: (cancelRate > 30 ? 'High' : cancelRate > 15 ? 'Medium' : 'Low') as 'Low' | 'Medium' | 'High'
    };
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Customers</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Track spending, bookings, and account activity.</p>
        </div>
      </div>

      {/* Graceful Database Schema Warning Banner */}
      {isSchemaError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-amber-700">warning</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
              <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                The profiles table is missing the columns <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">internal_note</code> and <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">risk_trigger</code>. To enable internal CRM logging and manual risk override triggers, please execute the DDL queries inside your Supabase Dashboard SQL editor.
              </p>
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl border border-amber-500/25 transition-all text-center">
            Schema Pending
          </div>
        </div>
      )}

      {/* Interactive Customer CRM Client Application */}
      <CustomerCRM initialCustomers={processedCustomers} />
    </div>
  );
}
