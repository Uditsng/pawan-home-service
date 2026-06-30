import { getNotificationTemplates, getActiveServicesCatalog } from "../actions";
import { TemplatesList } from "./TemplatesList";

export const dynamic = "force-dynamic";

export default async function NotificationTemplatesPage() {
  let templates = [];
  let isSchemaError = false;

  try {
    templates = await getNotificationTemplates();
  } catch (err) {
    console.error("Error loading templates:", err);
    isSchemaError = true;
  }

  const services = await getActiveServicesCatalog();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-primary font-headline">Notification Templates</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 text-sm">
            Manage reusable templates for promotions, festivals, booking updates, and announcements.
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
                The database tables for templates do not exist. Please run the SQL migration in your Supabase Dashboard first.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <TemplatesList initialTemplates={templates} services={services} />
      )}
    </div>
  );
}
