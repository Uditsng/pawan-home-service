"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  duplicateAdminNotification,
  cancelScheduledNotification,
  sendNotificationCampaignAction,
  sendTestNotificationAction
} from "../actions";

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

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

interface CampaignDetailsClientProps {
  campaign: Campaign;
  logs: DeliveryLog[];
  users: UserProfile[];
}

export function CampaignDetailsClient({
  campaign,
  logs,
  users,
}: CampaignDetailsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Test Notification States
  const [testUserId, setTestUserId] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState("");
  const [testError, setTestError] = useState("");

  // Campaign dispatch execution
  const [isSendingProgressOpen, setIsSendingProgressOpen] = useState(false);
  const [sendProgressStep, setSendProgressStep] = useState<"preparing" | "sending" | "completed" | "failed">("preparing");
  const [sentCount, setSentCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  // Delivery Rate Calculation
  const recipientCount = campaign.recipient_count || 0;
  const successes = campaign.success_count || 0;
  const deliveryRate = recipientCount > 0 ? (successes / recipientCount) * 100 : 0;

  // Duplicate handler
  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const cloned = await duplicateAdminNotification(campaign.id);
      if (cloned) {
        router.push(`/admin/notifications/${cloned.id}/edit`);
        router.refresh();
      }
    } catch (err) {
      alert("Duplication failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Scheduled handler
  const handleCancelScheduled = async () => {
    if (!confirm("Are you sure you want to cancel this scheduled dispatch?")) return;
    setLoading(true);
    try {
      await cancelScheduledNotification(campaign.id);
      router.refresh();
    } catch (err) {
      alert("Cancellation failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger campaign send
  const handleSendNow = async () => {
    if (!confirm("This will broadcast the notification campaign immediately to the targeted audience. Proceed?")) return;
    setIsSendingProgressOpen(true);
    setSendProgressStep("preparing");
    setSentCount(0);

    try {
      setSendProgressStep("sending");
      const dispatchResult = await sendNotificationCampaignAction(campaign.id);
      
      if (dispatchResult.success) {
        setSuccessCount(dispatchResult.successCount);
        setFailureCount(dispatchResult.failureCount);
        setSentCount(dispatchResult.recipients);
        setSendProgressStep("completed");
      } else {
        setSendProgressStep("failed");
      }
    } catch (err) {
      console.error(err);
      setSendProgressStep("failed");
    }
  };

  // Trigger test send
  const handleSendTest = async () => {
    if (!testUserId) {
      setTestError("Please select a target user for the test.");
      return;
    }
    setTestSending(true);
    setTestSuccess("");
    setTestError("");
    try {
      await sendTestNotificationAction({
        title: campaign.title,
        message: campaign.message,
        image_url: campaign.image_url || undefined,
        deep_link: campaign.deep_link || undefined,
        targetUserId: testUserId,
      });
      setTestSuccess("Test notification dispatched successfully!");
    } catch (err) {
      setTestError((err as Error).message);
    } finally {
      setTestSending(false);
    }
  };

  const isDraft = campaign.status === "draft";
  const isScheduled = campaign.status === "scheduled";
  const isCompleted = campaign.status === "completed";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── LEFT: CAMPAIGN OVERVIEW & METRICS ─── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Performance Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="solid" className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Total Recipients</span>
            <h2 className="text-xl font-bold font-headline text-primary mt-2">{recipientCount.toLocaleString()}</h2>
          </Card>
          <Card variant="solid" className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Successful</span>
            <h2 className="text-xl font-bold font-headline text-secondary mt-2">{successes.toLocaleString()}</h2>
          </Card>
          <Card variant="solid" className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Failed / Offline</span>
            <h2 className="text-xl font-bold font-headline text-red-600 mt-2">{campaign.failure_count?.toLocaleString() || 0}</h2>
          </Card>
          <Card variant="solid" className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">Delivery Rate</span>
            <h2 className="text-xl font-bold font-headline text-primary mt-2">{deliveryRate.toFixed(1)}%</h2>
          </Card>
        </div>

        {/* Future placeholders */}
        <div className="bg-surface p-4 rounded-xl border border-outline-variant/15 text-xs text-on-surface-variant/90 space-y-2.5">
          <h4 className="font-bold text-primary text-xs flex items-center gap-1.5 font-headline">
            <span className="material-symbols-outlined text-secondary text-sm">analytics</span>
            Engagement Analytics (Future Scope)
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center opacity-50 select-none">
            <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest">
              <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 block mb-1">Open Rate</span>
              <span className="text-base font-black text-primary">--%</span>
            </div>
            <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest">
              <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 block mb-1">Click Rate</span>
              <span className="text-base font-black text-primary">--%</span>
            </div>
            <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest">
              <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 block mb-1">Conversion</span>
              <span className="text-base font-black text-primary">--%</span>
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <Card variant="solid" className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Campaign Metadata</h3>
          
          <div className="space-y-3.5 divide-y divide-outline-variant/10 text-xs">
            {/* Title */}
            <div>
              <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block mb-1">Title</span>
              <p className="font-bold text-primary text-sm tracking-tight">{campaign.title}</p>
            </div>

            {/* Message */}
            <div className="pt-3">
              <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block mb-1">Message</span>
              <p className="font-semibold text-on-surface-variant leading-relaxed text-xs">{campaign.message}</p>
            </div>

            {/* Image banner */}
            {campaign.image_url && (
              <div className="pt-3">
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block mb-2">Showcase Banner</span>
                <div className="relative max-w-md aspect-2/1 bg-surface-container rounded-xl overflow-hidden border border-outline-variant/20 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={campaign.image_url} alt="Cover banner" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Attributes */}
            <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block leading-none mb-1">Category</span>
                <span className="font-bold text-primary text-xs capitalize">{campaign.category}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block leading-none mb-1">Priority</span>
                <span className="font-bold text-primary text-xs uppercase">{campaign.priority}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block leading-none mb-1">Audience Type</span>
                <Badge variant="surface" className="text-[8px] font-bold py-0.5 leading-none">
                  {campaign.audience_type}
                </Badge>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block leading-none mb-1">Deep Link</span>
                <span className="font-mono text-[10px] text-primary truncate block font-bold" title={campaign.deep_link || "/"}>
                  {campaign.deep_link || "/"}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block leading-none mb-1">Created At</span>
                <span className="font-semibold text-on-surface-variant text-[11px]">
                  {format(new Date(campaign.created_at), "dd MMM yy · hh:mm a")}
                </span>
              </div>
              {campaign.scheduled_at && (
                <div>
                  <span className="text-[9px] font-bold text-amber-700/50 block leading-none mb-1">Scheduled At</span>
                  <span className="font-bold text-amber-700 text-[11px]">
                    {format(new Date(campaign.scheduled_at), "dd MMM yy · hh:mm a")}
                  </span>
                </div>
              )}
              {campaign.expires_at && (
                <div>
                  <span className="text-[9px] font-bold text-on-surface-variant/40 block leading-none mb-1">Expires At</span>
                  <span className="font-semibold text-on-surface-variant text-[11px]">
                    {format(new Date(campaign.expires_at), "dd MMM yy · hh:mm a")}
                  </span>
                </div>
              )}
              {campaign.creator?.full_name && (
                <div>
                  <span className="text-[9px] font-bold text-on-surface-variant/40 block leading-none mb-1">Created By</span>
                  <span className="font-semibold text-on-surface-variant text-[11px]">
                    {campaign.creator.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ─── AUDIT DELIVERY LOGS ─── */}
        <Card variant="solid" className="p-0 overflow-hidden shadow-sm border border-outline-variant/15">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Delivery Audit Log</h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-0.5">Showing last 100 recipient dispatches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim/30 border-b border-outline-variant/10">
                  <th className="px-6 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Recipient</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Device Token</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Platform</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-center">Status</th>
                  <th className="px-6 py-3 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 text-right">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant/40 italic">
                      No delivery audits logged for this campaign yet.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-primary">
                        <p>{log.user?.full_name || "N/A"}</p>
                        <p className="text-[10px] text-on-surface-variant/50 font-normal">{log.user?.email || "N/A"}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[9px] text-on-surface-variant/70 truncate max-w-[200px]" title={log.device_token || "None"}>
                        {log.device_token ? `${log.device_token.slice(0, 10)}...${log.device_token.slice(-10)}` : "No registered token"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-primary uppercase text-[10px]">
                        {log.platform || "Web"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant={log.status === "sent" ? "success" : "danger"} className="text-[8px] font-bold">
                          {log.status}
                        </Badge>
                        {log.failure_reason && (
                          <p className="text-[8px] text-red-500 font-bold mt-1 text-left">{log.failure_reason}</p>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-on-surface-variant/50 text-[10px]">
                        {format(new Date(log.sent_at), "dd MMM yy · hh:mm a")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ─── RIGHT: ACTIONS & TEST TOOLS ─── */}
      <div className="lg:col-span-1 space-y-6">
        {/* Campaign Control Console */}
        <Card variant="solid" className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Campaign Console</h3>
          
          <div className="flex flex-col gap-2.5">
            {isDraft && (
              <Link href={`/admin/notifications/${campaign.id}/edit`} className="w-full">
                <Button variant="outline" className="w-full text-xs">
                  <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span>
                  Edit Draft
                </Button>
              </Link>
            )}

            {isScheduled && (
              <Button
                variant="outline"
                className="w-full text-xs text-red-600 hover:bg-red-500/5 border-red-200"
                onClick={handleCancelScheduled}
                disabled={loading}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">cancel</span>
                Cancel Scheduled
              </Button>
            )}

            {(isDraft || isScheduled) && (
              <Button
                variant="primary"
                className="w-full text-xs text-white"
                onClick={handleSendNow}
                disabled={loading}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">send</span>
                Send Broadcast Now
              </Button>
            )}

            {isCompleted && (
              <Button
                variant="secondary"
                className="w-full text-xs"
                onClick={handleSendNow}
                disabled={loading}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">replay</span>
                Resend Campaign
              </Button>
            )}

            <Button
              variant="slate"
              className="w-full text-xs"
              onClick={handleDuplicate}
              disabled={loading}
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">content_copy</span>
              Duplicate Campaign
            </Button>
          </div>
        </Card>

        {/* Live Test Console */}
        <Card variant="solid" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary font-headline tracking-tight">Test Delivery</h3>
            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase">Debug Dispatcher</span>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase block mb-1">Target User</label>
              <select
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="">-- Choose User for Test --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              className="w-full text-xs text-white"
              onClick={handleSendTest}
              disabled={testSending || !testUserId}
            >
              {testSending ? "Sending test..." : "Send Test Notification"}
            </Button>

            {testSuccess && <p className="text-xs text-secondary font-bold text-center mt-1">{testSuccess}</p>}
            {testError && <p className="text-xs text-red-600 font-bold text-center mt-1">{testError}</p>}
          </div>
        </Card>
      </div>

      {/* ─── SENDING PROGRESS MODAL ─── */}
      {isSendingProgressOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center z-100 p-4">
          <Card variant="solid" className="w-full max-w-md p-6 space-y-4 text-center">
            <h3 className="text-base font-bold text-primary font-headline">
              Broadcast Dispatch Console
            </h3>

            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              {sendProgressStep === "preparing" && (
                <>
                  <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-on-surface-variant">Resolving targeting parameters...</p>
                </>
              )}

              {sendProgressStep === "sending" && (
                <>
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-primary">Transmitting messages to Firebase Cloud Messaging...</p>
                </>
              )}

              {sendProgressStep === "completed" && (
                <>
                  <div className="w-12 h-12 bg-secondary/15 rounded-full flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-2xl font-bold">verified</span>
                  </div>
                  <p className="text-xs font-bold text-secondary">Broadcast Campaign Sent Successfully!</p>
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/10 w-full text-left space-y-1.5 text-[11px] font-semibold text-primary">
                    <div className="flex justify-between">
                      <span>Resolved Recipients:</span>
                      <span>{sentCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successfully Dispatched:</span>
                      <span>{successCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unregistered / Offline:</span>
                      <span>{failureCount}</span>
                    </div>
                  </div>
                </>
              )}

              {sendProgressStep === "failed" && (
                <>
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">error</span>
                  </div>
                  <p className="text-xs font-bold text-red-600">Broadcast Dispatch Failed</p>
                  <p className="text-[11px] text-on-surface-variant/60">Check server logs for details.</p>
                </>
              )}
            </div>

            {(sendProgressStep === "completed" || sendProgressStep === "failed") && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="primary"
                  className="text-white text-xs px-6"
                  onClick={() => {
                    setIsSendingProgressOpen(false);
                    router.refresh();
                  }}
                >
                  Close Console
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
