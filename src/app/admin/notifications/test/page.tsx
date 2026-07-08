"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { runDiagnostics, sendTestNotificationAction, type DiagnosticResult } from "./actions";

export default function NotificationTestPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [targetUserId, setTargetUserId] = useState("");
  const [recipientRole, setRecipientRole] = useState<"customer" | "partner" | "admin">("partner");
  const [customTitle, setCustomTitle] = useState("🔔 Test Notification");
  const [customBody, setCustomBody] = useState("This is a diagnostic push notification from the admin console.");
  const [customType, setCustomType] = useState<"new_job_offer" | "partner_assigned" | "general">("general");

  const loadDiagnostics = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await runDiagnostics();
      setDiagnostics(res);
      // Auto-select the first user in the token list if target is empty
      if (res.recentTokens.length > 0 && !targetUserId) {
        setTargetUserId(res.recentTokens[0].user_id);
        setRecipientRole(res.recentTokens[0].role as "customer" | "partner" | "admin");
      }
    } catch (err) {
      setErrorMessage("Failed to load diagnostic metrics: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleSendTest = async (type: "generic" | "job" | "custom") => {
    if (!targetUserId) {
      setErrorMessage("Please select or enter a target user ID.");
      return;
    }
    setActionLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    let title = "";
    let body = "";
    let nType = customType;
    let recRole = recipientRole;

    if (type === "generic") {
      title = "👋 Hello from PHS Team";
      body = "This is a quick system check to confirm your push notifications are working correctly!";
      nType = "general";
    } else if (type === "job") {
      title = "🔔 New Job Available!";
      body = "Deep House Cleaning in Kanpur Nagar — Payout: ₹1250";
      nType = "new_job_offer";
      recRole = "partner";
    } else {
      title = customTitle;
      body = customBody;
      nType = customType;
    }

    try {
      const res = await sendTestNotificationAction({
        userId: targetUserId,
        title,
        body,
        type: nType,
        recipientRole: recRole,
        metadata: {
          booking_id: "test-booking-123",
          category: "cleaning",
        },
      });

      if (res.success) {
        setSuccessMessage(`Test notification (${nType}) dispatched successfully!`);
        loadDiagnostics(); // Refresh log list
      } else {
        setErrorMessage(res.error || "Failed to dispatch notification.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6 sm:p-8 font-bricolage">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-1.5">
              <span className="material-symbols-outlined text-sm">terminal</span>
              Developer Tools
            </div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Notification System Diagnostics</h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              Verify your Firebase push tokens, schema integrity, and simulate push events instantly.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/notifications">
              <Button variant="outline">
                <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
                Console
              </Button>
            </Link>
            <Button onClick={loadDiagnostics} disabled={loading} variant="slate">
              <span className={`material-symbols-outlined mr-2 text-sm ${loading ? "animate-spin" : ""}`}>
                sync
              </span>
              Refresh Metrics
            </Button>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-2xl text-secondary text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {errorMessage}
          </div>
        )}

        {/* Top diagnostics row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* DB Schema Check */}
          <Card variant="solid" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary text-base">DB Schema Status</h3>
                <span className="material-symbols-outlined text-on-surface-variant">database</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant font-medium">delivery_status Column:</span>
                  {loading ? (
                    <span className="text-xs text-on-surface-variant">Checking...</span>
                  ) : diagnostics?.hasDeliveryStatusColumn ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="danger">Missing</Badge>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant font-medium">Realtime Publications:</span>
                  <Badge variant="primary">Configured</Badge>
                </div>
              </div>
            </div>
            {!loading && !diagnostics?.hasDeliveryStatusColumn && (
              <div className="mt-6 p-3.5 bg-warning/10 border border-warning/20 rounded-2xl text-xs font-semibold text-[#D97706] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Schema Warning
                </div>
                Database column is missing. Please make sure the SQL migration `20260708000000_fix_notifications_and_realtime.sql` is applied.
              </div>
            )}
          </Card>

          {/* FCM Registered Tokens */}
          <Card variant="solid" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-primary text-base">Registered Push Tokens (Device Registry)</h3>
              <span className="material-symbols-outlined text-on-surface-variant">devices</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {["partner", "customer", "admin"].map((role) => {
                const counts = diagnostics?.tokensCountByRole[role] || { android: 0, ios: 0, web: 0 };
                const total = counts.android + counts.ios + counts.web;
                return (
                  <div key={role} className="bg-surface border border-outline-variant/10 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">
                        {role}s
                      </div>
                      <div className="text-2xl font-bold text-primary">{loading ? "..." : total}</div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                      <div className="flex justify-between">
                        <span>Android:</span>
                        <span className="font-bold">{loading ? "-" : counts.android}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>iOS:</span>
                        <span className="font-bold">{loading ? "-" : counts.ios}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Web:</span>
                        <span className="font-bold">{loading ? "-" : counts.web}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Testing Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Quick Simulators */}
          <Card variant="solid" className="space-y-6">
            <div>
              <h3 className="font-bold text-primary text-lg mb-1">Quick Notification Simulators</h3>
              <p className="text-xs text-on-surface-variant">
                Trigger preset notifications instantly to the selected target user to verify receipt.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Select Target User Token
                </label>
                {loading ? (
                  <div className="h-10 bg-surface border border-outline-variant/10 rounded-xl animate-pulse" />
                ) : (diagnostics?.recentTokens.length || 0) === 0 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold">
                    No registered FCM tokens found. Open the PHS app on an emulator/device to register a token.
                  </div>
                ) : (
                  <select
                    className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary focus:outline-none focus:border-primary"
                    value={targetUserId}
                    onChange={(e) => {
                      setTargetUserId(e.target.value);
                      const matched = diagnostics?.recentTokens.find((t) => t.user_id === e.target.value);
                      if (matched) {
                        setRecipientRole(matched.role as "customer" | "partner" | "admin");
                      }
                    }}
                  >
                    {diagnostics?.recentTokens.map((tok) => (
                      <option key={tok.user_id} value={tok.user_id}>
                        {tok.full_name} ({tok.role.toUpperCase()} - {tok.platform.toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {targetUserId && (
                <div className="p-3.5 bg-surface border border-outline-variant/10 rounded-2xl text-xs space-y-1.5">
                  <div className="text-on-surface-variant font-semibold">
                    <span className="font-bold text-primary">Target ID:</span> {targetUserId}
                  </div>
                  <div className="text-on-surface-variant font-semibold">
                    <span className="font-bold text-primary">Role Target:</span> {recipientRole.toUpperCase()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button
                  onClick={() => handleSendTest("generic")}
                  disabled={actionLoading || !targetUserId}
                  variant="primary"
                  className="w-full text-xs py-3"
                >
                  <span className="material-symbols-outlined mr-1.5 text-sm">campaign</span>
                  Send Preset Welcome
                </Button>
                <Button
                  onClick={() => handleSendTest("job")}
                  disabled={actionLoading || !targetUserId || recipientRole !== "partner"}
                  variant="secondary"
                  className="w-full text-xs py-3"
                >
                  <span className="material-symbols-outlined mr-1.5 text-sm">pest_control</span>
                  Send Job Broadcast
                </Button>
              </div>
            </div>
          </Card>

          {/* Custom Notification Form */}
          <Card variant="solid" className="space-y-6">
            <div>
              <h3 className="font-bold text-primary text-lg mb-1">Custom Push Dispatcher</h3>
              <p className="text-xs text-on-surface-variant">
                Compose and transmit a customized notification payload directly to the target user.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Notification Type
                  </label>
                  <select
                    className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs font-semibold text-primary focus:outline-none focus:border-primary"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as "new_job_offer" | "partner_assigned" | "general")}
                  >
                    <option value="general">General Announcement</option>
                    <option value="new_job_offer">New Job Offer</option>
                    <option value="partner_assigned">Partner Assigned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Target Role
                  </label>
                  <select
                    className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-2.5 text-xs font-semibold text-primary focus:outline-none focus:border-primary"
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value as "customer" | "partner" | "admin")}
                  >
                    <option value="customer">Customer</option>
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:border-primary"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Body Message
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-surface border border-outline-variant/20 rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:border-primary resize-none"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                />
              </div>

              <Button
                onClick={() => handleSendTest("custom")}
                disabled={actionLoading || !targetUserId}
                variant="primary"
                className="w-full text-xs py-3"
              >
                <span className="material-symbols-outlined mr-1.5 text-sm">send</span>
                Dispatch Custom Push
              </Button>
            </div>
          </Card>
        </div>

        {/* Recently Registered Devices list */}
        <Card variant="solid">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-primary text-base">Recently Registered Devices</h3>
            <span className="text-xs text-on-surface-variant font-semibold">Showing up to 10 latest active devices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="pb-3 text-[10px] font-bold text-primary uppercase tracking-wider">User</th>
                  <th className="pb-3 text-[10px] font-bold text-primary uppercase tracking-wider">Role</th>
                  <th className="pb-3 text-[10px] font-bold text-primary uppercase tracking-wider">Platform</th>
                  <th className="pb-3 text-[10px] font-bold text-primary uppercase tracking-wider">Last Seen</th>
                  <th className="pb-3 text-[10px] font-bold text-primary uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-on-surface-variant animate-pulse">
                      Loading registered devices...
                    </td>
                  </tr>
                ) : (diagnostics?.recentTokens.length || 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-on-surface-variant">
                      No devices currently registered.
                    </td>
                  </tr>
                ) : (
                  diagnostics?.recentTokens.map((tok) => (
                    <tr key={tok.user_id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-3.5 text-sm">
                        <div className="font-bold text-primary">{tok.full_name}</div>
                        <div className="text-xs text-on-surface-variant">{tok.email}</div>
                      </td>
                      <td className="py-3.5 text-xs font-semibold">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tok.role === "partner" ? "bg-secondary/15 text-secondary" :
                          tok.role === "admin" ? "bg-primary/10 text-primary" :
                          "bg-surface-container text-on-surface-variant"
                        }`}>
                          {tok.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-primary font-bold uppercase">{tok.platform}</td>
                      <td className="py-3.5 text-xs text-on-surface-variant">
                        {new Date(tok.last_seen).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTargetUserId(tok.user_id);
                            setRecipientRole(tok.role as "customer" | "partner" | "admin");
                          }}
                        >
                          Select Target
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
}
