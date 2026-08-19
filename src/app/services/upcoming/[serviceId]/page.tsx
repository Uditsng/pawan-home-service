import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCachedUpcomingService } from "@/utils/supabase/cachedServiceQueries";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export default async function UpcomingServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = await getCachedUpcomingService(serviceId);
  if (!service) notFound();

  const supabase = await createClient();
  const { data: waitlistCount } = await supabase.rpc("get_service_waitlist_count", {
    p_service_id: serviceId,
  });

  return (
    <>
      <Header />
      <main className="bg-surface min-h-screen">
        <ComingSoonPage
          service={service}
          initialWaitlisted={false}
          waitlistCount={Number(waitlistCount) || 0}
          backHref="/services"
          backLabel="Back to Services"
        />
      </main>
      <Footer />
    </>
  );
}