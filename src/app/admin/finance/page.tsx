import { createClient } from "@/utils/supabase/server";
import { FinanceConsole } from "./FinanceConsole";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

interface BookingRow {
  id: string;
  total_amount: number | null;
  created_at: string;
  status: string;
  customer: {
    full_name: string | null;
  } | null;
  partner: {
    full_name: string | null;
  } | null;
}

export default async function AdminFinancePage() {
  const supabase = await createClient();

  const [settings, bookingsResult] = await Promise.all([
    fetchPlatformSettings(supabase),
    supabase
      .from('bookings')
      .select(`
        id,
        total_amount,
        created_at,
        status,
        customer:customer_id (full_name),
        partner:partner_id (full_name)
      `)
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
  ]);

  const bookingRows = (bookingsResult.data as unknown as BookingRow[]) || [];

  const serializedBookings = bookingRows.map((b) => ({
    id: b.id,
    total_amount: Number(b.total_amount || 0),
    created_at: b.created_at,
    status: b.status,
    customer: b.customer ? {
      full_name: b.customer.full_name || "Guest Customer"
    } : null,
    partner: b.partner ? {
      full_name: b.partner.full_name || "Assigned Pro"
    } : null
  }));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Payments</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">Track payments, active commissions, and professional payouts.</p>
      </div>

      {/* Finance Console Ledger */}
      <FinanceConsole initialBookings={serializedBookings} commissionPercent={settings.platformCommission} />
    </div>
  );
}
