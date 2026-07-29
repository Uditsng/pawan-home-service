import { createClient } from "@/utils/supabase/server";
import { FinanceConsole } from "./FinanceConsole";
import { fetchPlatformSettings } from "@/lib/engines/platformSettingsEngine";

interface RawBooking {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  services: { title: string } | null;
  customer: { full_name: string } | null;
  partner: { full_name: string } | null;
}

interface RawPricing {
  booking_id: string;
  base_price: number;
  addons_total: number;
  gst_amount: number;
  discount_amount: number;
  total_price: number;
}

export interface EnrichedBooking extends RawBooking {
  booking_pricing: RawPricing | null;
}

export default async function AdminFinancePage() {
  const supabase = await createClient();

  const [bookingsResult, pricingResult, platformSettings] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id,
        total_amount,
        created_at,
        status,
        services:service_id(title),
        customer:customer_id(full_name),
        partner:partner_id(full_name)
      `)
      .neq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("booking_pricing")
      .select("booking_id, base_price, addons_total, gst_amount, discount_amount, total_price"),
    fetchPlatformSettings(supabase),
  ]);

  const bookings = (bookingsResult.data as unknown as RawBooking[]) || [];
  const pricingData = (pricingResult.data as unknown as RawPricing[]) || [];
  const pricingMap = new Map(pricingData.map((p) => [p.booking_id, p]));

  const enriched: EnrichedBooking[] = bookings.map((b) => ({
    ...b,
    booking_pricing: pricingMap.get(b.id) || null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Payments</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
          Track payments, active commissions, and professional payouts.
        </p>
      </div>
      <FinanceConsole initialBookings={enriched} commissionPercent={platformSettings.platformCommission} />
    </div>
  );
}
