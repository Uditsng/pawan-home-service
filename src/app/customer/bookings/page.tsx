import BottomNav from "@/components/BottomNav";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BookingsClient from "./BookingsClient";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch bookings with service + partner details
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(title, category), partner:partner_id(full_name, avatar_url), reviews:reviews(id, rating, comment)')
    .eq('customer_id', user.id)
    .order('scheduled_date', { ascending: false });

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-24">

      <main className="max-w-7xl mx-auto pb-8">
        {/* Page Title */}
        <section className="mt-6 md:mt-8 mb-4 md:mb-6 px-4 md:px-6">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">Bookings</h2>
          <p className="text-on-surface-variant font-medium mt-1 text-sm md:text-base">Manage your professional services</p>
        </section>

        <BookingsClient bookings={bookings || []} />
      </main>

      <BottomNav />
    </div>
  );
}
