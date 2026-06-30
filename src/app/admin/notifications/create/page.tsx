import { getTargetAudienceUsers, getNotificationTemplates, getActiveServicesCatalog } from "../actions";
import { CreateNotificationForm } from "./CreateNotificationForm";

export const dynamic = "force-dynamic";

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

export default async function CreateNotificationPage() {
  let users: UserProfile[] = [];
  let templates: Template[] = [];
  let services: ServiceItem[] = [];
  let isSchemaError = false;

  try {
    const [fetchedUsers, fetchedTemplates, fetchedServices] = await Promise.all([
      getTargetAudienceUsers(),
      getNotificationTemplates(),
      getActiveServicesCatalog(),
    ]);
    users = fetchedUsers as UserProfile[];
    templates = fetchedTemplates as Template[];
    services = fetchedServices as ServiceItem[];
  } catch (err) {
    console.error("[CreateNotificationPage] Error loading dependencies:", err);
    isSchemaError = true;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Create Notification</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Draft, schedule, or broadcast a new message to your selected audience.
          </p>
        </div>
      </div>

      {isSchemaError ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex items-start gap-4">
          <div className="flex items-start gap-4">
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
      ) : (
        <CreateNotificationForm
          users={users}
          templates={templates}
          services={services}
        />
      )}
    </div>
  );
}
