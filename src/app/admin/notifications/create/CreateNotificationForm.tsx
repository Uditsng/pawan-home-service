"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NotificationImageUploadField } from "@/components/ui/NotificationImageUploadField";
import { createAdminNotification, sendNotificationCampaignAction, sendTestNotificationAction } from "../actions";

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

interface CreateNotificationFormProps {
  users: UserProfile[];
  templates: Template[];
  services: ServiceItem[];
}

export function CreateNotificationForm({
  users,
  templates,
  services,
}: CreateNotificationFormProps) {
  const router = useRouter();

  // Basic Info States
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("promotional");
  const [priority, setPriority] = useState("normal");

  // Deep Link States
  const [deepLinkType, setDeepLinkType] = useState("home");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [customDeepLink, setCustomDeepLink] = useState("");

  // Audience States
  const [audienceType, setAudienceType] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Delivery & Expiry States
  const [deliveryOption, setDeliveryOption] = useState<"now" | "schedule" | "draft">("draft");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [expiryOption, setExpiryOption] = useState("never");
  const [customExpiryDate, setCustomExpiryDate] = useState("");

  // Interaction / Modal States
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [testSuccess, setTestSuccess] = useState("");
  const [testError, setTestError] = useState("");
  
  // Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [resolvedRecipientCount, setResolvedRecipientCount] = useState(0);

  // Send Progress Modal
  const [isSendingProgressOpen, setIsSendingProgressOpen] = useState(false);
  const [sendProgressStep, setSendProgressStep] = useState<"preparing" | "sending" | "completed" | "failed">("preparing");
  const [sentCount, setSentCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  // Calculate deep link parameter string
  const getResolvedDeepLink = () => {
    switch (deepLinkType) {
      case "home":
        return "/";
      case "offers":
        return "/offers";
      case "bookings":
        return "/customer/bookings";
      case "booking_details":
        return "/customer/bookings/details";
      case "wallet":
        return "/customer/wallet";
      case "refer_earn":
        return "/customer/referrals";
      case "subscriptions":
        return "/customer/subscriptions";
      case "service":
        return `/services/detail?id=${selectedServiceId}`;
      case "category":
        return `/services?category=${selectedCategoryName}`;
      case "custom":
        return customDeepLink;
      default:
        return "/";
    }
  };

  // Pre-populate from templates
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;

    const t = templates.find(item => item.id === templateId);
    if (t) {
      setTitle(t.title);
      setMessage(t.message);
      setImageUrl(t.image_url || "");
      setCategory(t.category);
      setPriority(t.priority);
      
      // Parse deep link if matches standard pattern
      const dl = t.deep_link || "";
      if (dl.includes("/services/detail?id=")) {
        setDeepLinkType("service");
        setSelectedServiceId(dl.split("id=")[1] || "");
      } else if (dl.includes("/services?category=")) {
        setDeepLinkType("category");
        setSelectedCategoryName(dl.split("category=")[1] || "");
      } else if (dl === "/") {
        setDeepLinkType("home");
      } else if (dl === "/offers") {
        setDeepLinkType("offers");
      } else if (dl === "/customer/bookings") {
        setDeepLinkType("bookings");
      } else if (dl === "/customer/wallet") {
        setDeepLinkType("wallet");
      } else if (dl === "/customer/referrals") {
        setDeepLinkType("refer_earn");
      } else if (dl && dl !== "") {
        setDeepLinkType("custom");
        setCustomDeepLink(dl);
      }
    }
  };

  // Resolve total recipient count
  useEffect(() => {
    let count = 0;
    if (audienceType === "all") {
      count = users.length;
    } else if (audienceType === "customers") {
      count = users.filter(u => u.role === "customer").length;
    } else if (audienceType === "partners") {
      count = users.filter(u => u.role === "partner").length;
    } else if (audienceType === "admins") {
      count = users.filter(u => u.role === "admin").length;
    } else if (audienceType === "selected") {
      count = selectedUserIds.length;
    }
    setResolvedRecipientCount(count);
  }, [audienceType, selectedUserIds, users]);

  // Handle Save / Submit
  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (deliveryOption === "now") {
      // Trigger confirmation dialog for broadcast
      setIsConfirmOpen(true);
    } else {
      // Direct save for schedule/draft
      await submitForm();
    }
  };

  const submitForm = async () => {
    setLoading(true);
    try {
      // Calculate scheduling dates
      let scheduledAt: string | null = null;
      if (deliveryOption === "schedule" && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Calculate expiry date
      let expiresAt: string | null = null;
      if (expiryOption === "1day") {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (expiryOption === "3days") {
        expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      } else if (expiryOption === "7days") {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (expiryOption === "custom" && customExpiryDate) {
        expiresAt = new Date(customExpiryDate).toISOString();
      }

      const campaignData = {
        title,
        message,
        image_url: imageUrl || undefined,
        category,
        priority,
        audience_type: audienceType,
        audience_filters: audienceType === "selected" ? { userIds: selectedUserIds } : {},
        deep_link: getResolvedDeepLink(),
        status: deliveryOption === "schedule" ? "scheduled" as const : "draft" as const,
        scheduled_at: scheduledAt,
        expires_at: expiresAt,
      };

      const result = await createAdminNotification(campaignData);
      if (result) {
        router.push("/admin/notifications");
        router.refresh();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastConfirm = async () => {
    setIsConfirmOpen(false);
    setIsSendingProgressOpen(true);
    setSendProgressStep("preparing");
    setSentCount(0);

    try {
      // 1. Create draft campaign record
      const campaignData = {
        title,
        message,
        image_url: imageUrl || undefined,
        category,
        priority,
        audience_type: audienceType,
        audience_filters: audienceType === "selected" ? { userIds: selectedUserIds } : {},
        deep_link: getResolvedDeepLink(),
        status: "draft" as const,
      };

      const campaign = await createAdminNotification(campaignData);
      if (!campaign) throw new Error("Failed to initialize campaign record.");

      // 2. Trigger send
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

  // Test Notification sending
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
        title,
        message,
        image_url: imageUrl,
        deep_link: getResolvedDeepLink(),
        targetUserId: testUserId,
      });
      setTestSuccess("Test notification dispatched successfully!");
    } catch (err) {
      setTestError((err as Error).message);
    } finally {
      setTestSending(false);
    }
  };

  // Filter list of users for searchable select
  const filteredUsers = users.filter(u => {
    const searchStr = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
    return searchStr.includes(userSearchTerm.toLowerCase()) && !selectedUserIds.includes(u.id);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ─── FORM (LEFT) ─── */}
      <form onSubmit={handleSaveClick} className="lg:col-span-2 space-y-6">
        <Card variant="solid" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-primary font-headline">Campaign Content</h2>
          
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                Load From Template
              </label>
              <select
                onChange={handleTemplateChange}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="">-- Choose Template (Optional) --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block">
                Notification Title *
              </label>
              <span className={`text-[9px] font-bold ${title.length > 65 ? "text-amber-600" : "text-on-surface-variant/40"}`}>
                {title.length}/65 chars (FCM recommended max)
              </span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monsoon Mega Sale — Flat 20% Off!"
              className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
            />
          </div>

          {/* Message Body */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block">
                Notification Message *
              </label>
              <span className={`text-[9px] font-bold ${message.length > 240 ? "text-amber-600" : "text-on-surface-variant/40"}`}>
                {message.length}/240 chars (FCM recommended max)
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Book any kitchen cleaning or bathroom deep cleaning service this weekend and enjoy instant flat discount. Limited bookings only!"
              className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all resize-none"
            />
          </div>

          {/* Image Upload */}
          <NotificationImageUploadField
            defaultValue={imageUrl}
            onValueChange={setImageUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="promotional">Promotional</option>
                <option value="offers">Offers</option>
                <option value="discounts">Discounts</option>
                <option value="festival">Festival</option>
                <option value="reminder">Reminder</option>
                <option value="booking_update">Booking Update</option>
                <option value="payment">Payment</option>
                <option value="announcement">Announcement</option>
                <option value="emergency">Emergency</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="normal">Normal (Standard Delivery)</option>
                <option value="high">High (Bypasses battery limits/instant)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ─── TARGET AUDIENCE CONSOLE ─── */}
        <Card variant="solid" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-primary font-headline">Audience Targeting</h2>
          
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-2">
              Select Audience Group
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {["all", "customers", "partners", "admins", "selected"].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAudienceType(type)}
                  className={`px-3 py-2 rounded-xl text-center text-xs font-bold transition-all border select-none cursor-pointer ${
                    audienceType === type
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface text-on-surface border-outline-variant/20 hover:border-primary"
                  }`}
                >
                  {type === "all" ? "All Users" :
                   type === "customers" ? "Customers" :
                   type === "partners" ? "Professionals" :
                   type === "admins" ? "Admins" : "Custom List"}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Users Multi-Select */}
          {audienceType === "selected" && (
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block">
                Target Selected Users
              </label>

              {/* Chips row */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-surface rounded-xl border border-outline-variant/10">
                {selectedUserIds.length === 0 ? (
                  <span className="text-[11px] text-on-surface-variant/40 italic p-1">No users selected. Search and add below.</span>
                ) : (
                  selectedUserIds.map(uid => {
                    const user = users.find(u => u.id === uid);
                    return (
                      <Badge key={uid} variant="primary" className="text-[10px] flex items-center gap-1">
                        {user?.full_name || user?.email || "User"}
                        <span
                          className="material-symbols-outlined text-xs leading-none cursor-pointer hover:bg-primary/20 rounded-full"
                          onClick={() => setSelectedUserIds(prev => prev.filter(item => item !== uid))}
                        >
                          close
                        </span>
                      </Badge>
                    );
                  })
                )}
              </div>

              {/* Search dropdown */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/50 text-base">search</span>
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => { setUserSearchTerm(e.target.value); setShowUserDropdown(true); }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />

                {showUserDropdown && userSearchTerm && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl z-50 divide-y divide-outline-variant/10">
                    {filteredUsers.length === 0 ? (
                      <p className="p-3 text-xs text-on-surface-variant/50 italic">No users found.</p>
                    ) : (
                      filteredUsers.slice(0, 10).map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserIds(prev => [...prev, u.id]);
                            setUserSearchTerm("");
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-xs font-bold text-primary flex justify-between"
                        >
                          <span>{u.full_name || "N/A"}</span>
                          <span className="text-on-surface-variant/60 font-mono text-[10px] uppercase">({u.role})</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Future segmentation placeholders */}
          <div className="bg-surface-container-low p-4 rounded-xl space-y-2 border border-outline-variant/10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Future Targeting Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 opacity-50 select-none">
              <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface text-center text-[10px] font-bold">
                Users by City
              </div>
              <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface text-center text-[10px] font-bold">
                By Service Category
              </div>
              <div className="p-2 border border-dashed border-outline-variant rounded-lg bg-surface text-center text-[10px] font-bold">
                Inactive Users (30 Days)
              </div>
            </div>
          </div>
        </Card>

        {/* ─── DEEP LINKING & ROUTING ─── */}
        <Card variant="solid" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-primary font-headline">Deep Linking Actions</h2>
          <p className="text-[10px] text-on-surface-variant/60 leading-none">Determine which view inside the mobile app opens when the user clicks the notification banner.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                Destination Screen
              </label>
              <select
                value={deepLinkType}
                onChange={(e) => setDeepLinkType(e.target.value)}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="home">Home / Showcase</option>
                <option value="offers">Offers Panel</option>
                <option value="bookings">My Bookings List</option>
                <option value="wallet">Customer Wallet</option>
                <option value="refer_earn">Refer & Earn Panel</option>
                <option value="subscriptions">Subscriptions Console</option>
                <option value="service">Specific Service Detail</option>
                <option value="category">Specific Service Category</option>
                <option value="custom">Custom URL</option>
              </select>
            </div>

            {/* Service Subselector */}
            {deepLinkType === "service" && (
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Select Target Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  required
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                >
                  <option value="">-- Choose Service --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>[{s.category.toUpperCase()}] {s.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Subselector */}
            {deepLinkType === "category" && (
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Select Service Category
                </label>
                <select
                  value={selectedCategoryName}
                  onChange={(e) => setSelectedCategoryName(e.target.value)}
                  required
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                >
                  <option value="">-- Choose Category --</option>
                  <option value="pest-control">Pest Control</option>
                  <option value="cleaning-and-housekeeping">Cleaning & Housekeeping</option>
                  <option value="salon-at-home">Salon At Home</option>
                  <option value="appliance-repair">Appliance Repair</option>
                </select>
              </div>
            )}

            {/* Custom URL Input */}
            {deepLinkType === "custom" && (
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Custom Deep Link path
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. phs://custom/deep/link"
                  value={customDeepLink}
                  onChange={(e) => setCustomDeepLink(e.target.value)}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
            )}
          </div>
        </Card>

        {/* ─── DELIVERY OPTIONS & EXPIRY ─── */}
        <Card variant="solid" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-primary font-headline">Delivery Scheduling</h2>
          
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-2">
              Dispatch Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "draft", label: "Save as Draft", icon: "draft" },
                { type: "schedule", label: "Schedule Dispatch", icon: "schedule" },
                { type: "now", label: "Send Immediately", icon: "send" }
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setDeliveryOption(opt.type as any)}
                  className={`px-3 py-3 rounded-xl text-center text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                    deliveryOption === opt.type
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface text-on-surface border-outline-variant/20 hover:border-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-base leading-none">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Pickers */}
          {deliveryOption === "schedule" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-surface rounded-xl border border-outline-variant/15 animate-in slide-in-from-top-4 duration-300">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Scheduled Time
                </label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
            </div>
          )}

          {/* Expiry selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                Expires / Banner TTL
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value)}
                className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
              >
                <option value="never">Never Expire (TTL 48 Hours)</option>
                <option value="1day">1 Day</option>
                <option value="3days">3 Days</option>
                <option value="7days">7 Days</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {expiryOption === "custom" && (
              <div className="animate-in slide-in-from-top-4 duration-300">
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Custom Expiry Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>
            )}
          </div>
        </Card>

        {/* ─── TEST SEND TOOL ─── */}
        <Card variant="solid" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-primary font-headline">Test Notification</h2>
            <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase">Before Sending Broadcast</span>
          </div>

          <div className="flex gap-2">
            <select
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="grow p-3 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
            >
              <option value="">-- Choose User for Test --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSending || !title || !message}
              className="px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#0F172A] active:scale-95 disabled:opacity-50 transition-all shrink-0 cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              {testSending ? "Sending..." : "Send Test"}
            </button>
          </div>

          {testSuccess && <p className="text-xs text-secondary font-bold">{testSuccess}</p>}
          {testError && <p className="text-xs text-red-600 font-bold">{testError}</p>}
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/notifications")}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="text-white px-8"
            disabled={loading || !title.trim() || !message.trim()}
          >
            {loading ? "Saving..." : deliveryOption === "now" ? "Broadcast Now" : "Save Settings"}
          </Button>
        </div>
      </form>

      {/* ─── LIVE PREVIEW (RIGHT) ─── */}
      <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-4xl p-4 shadow-2xl relative overflow-hidden aspect-[9/19] flex flex-col justify-between max-w-[280px] mx-auto select-none">
          {/* Top Notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-2xl flex items-center justify-between px-3 text-[9px] text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">wifi</span>
              <span className="material-symbols-outlined text-[10px]">battery_full</span>
            </div>
          </div>

          {/* Dummy Lockscreen Header */}
          <div className="mt-8 text-center text-white/80">
            <h3 className="text-4xl font-extralight tracking-tight font-headline">9:41</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-white/40">Tuesday, 30 June</p>
          </div>

          {/* Banner notification preview */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/20 space-y-2 text-slate-900 animate-pulse">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/PHS.png" alt="PHS" className="w-4 h-4 object-contain" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">PHS App</span>
                </div>
                <span className="text-[9px] font-medium text-slate-400">now</span>
              </div>

              {/* Text Body */}
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900 tracking-tight leading-snug">
                  {title || "Notification Title Placeholder"}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-3">
                  {message || "Type the message body in the form to preview the layout inside this device alert container."}
                </p>
              </div>

              {/* Landscape image cover */}
              {imageUrl && (
                <div className="w-full aspect-2/1 rounded-lg overflow-hidden border border-slate-100 shadow-xs relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Notification Cover" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Lock Indicator */}
          <div className="text-center text-white/40 pb-1 flex flex-col items-center">
            <span className="material-symbols-outlined text-base">expand_less</span>
            <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Swipe up to unlock</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
          Real-time FCM Preview
        </p>
      </div>

      {/* ─── CONFIRMATION MODAL ─── */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center z-100 p-4">
          <Card variant="solid" className="w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-primary font-headline">
                Confirm Broadcast Notification
              </h3>
              <p className="text-xs text-on-surface-variant/80 mt-1 leading-normal">
                You are about to launch a live campaign broadcast immediately. This action cannot be undone.
              </p>
            </div>

            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface-variant/60">Recipients Count:</span>
                <Badge variant="success" className="font-black">
                  {resolvedRecipientCount.toLocaleString()} {audienceType === "all" ? "Users" : audienceType}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface-variant/60">Campaign Category:</span>
                <span className="font-bold text-primary capitalize">{category}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface-variant/60">FCM Priority:</span>
                <span className="font-bold text-primary uppercase">{priority}</span>
              </div>
              <div className="border-t border-outline-variant/10 pt-2.5">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">Message Header Preview:</span>
                <p className="text-xs font-bold text-primary line-clamp-1">{title}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="text-xs text-white"
                onClick={handleBroadcastConfirm}
              >
                Send Broadcast
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                  <p className="text-xs font-bold text-on-surface-variant">Resolving targeting parameters & cleaning dead tokens...</p>
                </>
              )}

              {sendProgressStep === "sending" && (
                <>
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-primary">Transmitting messages to Firebase Cloud Messaging (FCM) gateways...</p>
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
                  <p className="text-[11px] text-on-surface-variant/60">Please check server logs for more details.</p>
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
                    router.push("/admin/notifications");
                    router.refresh();
                  }}
                >
                  Return to Dashboard
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
