import { getAdminNotificationDetails, getTargetAudienceUsers, getNotificationTemplates, getActiveServicesCatalog } from "../../actions";
import { EditNotificationForm } from "./EditNotificationForm";

export const dynamic = "force-dynamic";

interface EditNotificationPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

interface Template {
  id: string;
  name: string;
  title: string;
  message: string;
  image_url: string | null;
  category: string;
  priority: string;
  deep_link: string | null;
}

interface ServiceItem {
  id: string;
  title: string;
  category: string;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  category: string;
  priority: string;
  audience_type: string;
  audience_filters?: {
    userIds?: string[];
  } | null;
  deep_link: string | null;
  status: string;
  scheduled_at: string | null;
  expires_at: string | null;
}

interface CampaignDetails {
  campaign: Campaign;
}

export default async function EditNotificationPage({ params }: EditNotificationPageProps) {
  const { id } = await params;
  
  let details: { campaign: Campaign } | null = null;
  let users: UserProfile[] = [];
  let templates: Template[] = [];
  let services: ServiceItem[] = [];
  let isSchemaError = false;

  try {
    const [fetchedDetails, fetchedUsers, fetchedTemplates, fetchedServices] = await Promise.all([
      getAdminNotificationDetails(id),
      getTargetAudienceUsers(),
      getNotificationTemplates(),
      getActiveServicesCatalog(),
    ]);
    details = fetchedDetails;
    users = fetchedUsers;
    templates = fetchedTemplates;
    services = fetchedServices;
  } catch (err) {
    console.error("[EditNotificationPage] Error loading campaign details:", err);
    isSchemaError = true;
  }

  if (isSchemaError) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline font-semibold">Edit Notification</h1>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-700">database_schema</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
            <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
              The database tables for managing notification templates and campaigns do not exist.
              Please execute the DDL queries in your Supabase Dashboard SQL Editor first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!details || !details.campaign) {
    return (
      <div className="p-6 text-center text-on-surface-variant/50 text-sm">
        Notification campaign not found.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Edit Notification</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Modify campaign properties for scheduled alerts or drafts.
          </p>
        </div>
      </div>

      <EditNotificationForm
        campaign={details.campaign}
        users={users}
        templates={templates}
        services={services}
      />
    </div>
  );
}
