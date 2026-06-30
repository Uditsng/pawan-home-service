import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAdminNotificationDetails, getTargetAudienceUsers } from "../actions";
import { CampaignDetailsClient } from "./CampaignDetailsClient";

export const dynamic = "force-dynamic";

interface CampaignDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  category: string;
  priority: string;
  audience_type: string;
  audience_filters?: Record<string, unknown> | null;
  deep_link: string | null;
  status: string;
  scheduled_at: string | null;
  expires_at: string | null;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string | null;
  } | null;
}

interface DeliveryLog {
  id: string;
  notification_id: string;
  user_id: string;
  device_token: string | null;
  platform: string | null;
  status: string;
  failure_reason: string | null;
  sent_at: string;
  user?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default async function CampaignDetailsPage({ params }: CampaignDetailsPageProps) {
  const { id } = await params;

  let details: { campaign: Campaign; logs: DeliveryLog[] } | null = null;
  try {
    details = await getAdminNotificationDetails(id) as { campaign: Campaign; logs: DeliveryLog[] };
  } catch (err) {
    console.error("Error loading details:", err);
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-700">database_schema</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">Database Schema Upgrade Required</h4>
            <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
              The database tables for managing notification campaigns and logs do not exist.
              Please execute the DDL queries in your Supabase Dashboard SQL Editor first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!details || !details.campaign) {
    return notFound();
  }

  const users = await getTargetAudienceUsers();

  const { campaign, logs } = details;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/notifications">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-all">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-primary font-headline">Campaign Details</h1>
            <p className="text-xs text-on-surface-variant/60 font-medium">Inspect statistics, delivery logs, and audit trails.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="surface" className="text-[10px] lowercase py-1 font-mono">
            ID: {campaign.id.slice(0, 8)}...
          </Badge>
          <Badge
            variant={
              campaign.status === "completed" ? "success" :
              campaign.status === "scheduled" ? "warning" :
              campaign.status === "draft" ? "surface" : "danger"
            }
            className="text-[10px] py-1"
          >
            {campaign.status}
          </Badge>
        </div>
      </div>

      <CampaignDetailsClient campaign={campaign} logs={logs} users={users} />
    </div>
  );
}
