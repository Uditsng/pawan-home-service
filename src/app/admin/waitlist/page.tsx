import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { WaitlistClient, UpcomingServiceRow, WaitlistMember } from "./WaitlistClient";

export default async function AdminWaitlistPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  // Upcoming services with their waitlist counts (admin RLS grants full access)
  const { data: servicesData } = await supabase
    .from('services')
    .select(`
      id,
      title,
      poster_url,
      status,
      subcategories (
        subcategory_name,
        icon_name,
        categories (
          category_name
        )
      ),
      waitlist:service_waitlist (
        count
      )
    `)
    .eq('status', 'upcoming')
    .order('created_at', { ascending: false });

  const upcomingServices = (servicesData || []) as unknown as UpcomingServiceRow[];

  // Waitlist members joined with their profiles for the expanded rows
  const serviceIds = upcomingServices.map((s) => s.id);
  let members: WaitlistMember[] = [];
  if (serviceIds.length > 0) {
    const { data: membersData } = await supabase
      .from('service_waitlist')
      .select(`
        id,
        service_id,
        created_at,
        profiles (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .in('service_id', serviceIds)
      .order('created_at', { ascending: false });
    members = (membersData || []) as unknown as WaitlistMember[];
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Waitlists</h1>
        <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
          Track customer interest in upcoming &quot;Coming Soon&quot; services.
        </p>
      </div>

      <WaitlistClient
        services={upcomingServices}
        members={members}
        totalWaitlisters={members.length}
      />
    </div>
  );
}