"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NotificationImageUploadField } from "@/components/ui/NotificationImageUploadField";
import { saveNotificationTemplate, deleteNotificationTemplate } from "../actions";

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

interface TemplatesListProps {
  initialTemplates: Template[];
  services: ServiceItem[];
}

export function TemplatesList({
  initialTemplates,
  services,
}: TemplatesListProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [loading, setLoading] = useState(false);

  // Drawer / Form States
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("promotional");
  const [priority, setPriority] = useState("normal");

  const [deepLinkType, setDeepLinkType] = useState("home");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [customDeepLink, setCustomDeepLink] = useState("");

  const getResolvedDeepLink = () => {
    switch (deepLinkType) {
      case "home": return "/";
      case "offers": return "/offers";
      case "bookings": return "/customer/bookings";
      case "wallet": return "/customer/wallet";
      case "refer_earn": return "/customer/referrals";
      case "subscriptions": return "/customer/subscriptions";
      case "service": return `/services/detail?id=${selectedServiceId}`;
      case "category": return `/services?category=${selectedCategoryName}`;
      case "custom": return customDeepLink;
      default: return "/";
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setName("");
    setTitle("");
    setMessage("");
    setImageUrl("");
    setCategory("promotional");
    setPriority("normal");
    setDeepLinkType("home");
    setSelectedServiceId("");
    setSelectedCategoryName("");
    setCustomDeepLink("");
    setIsOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditId(t.id);
    setName(t.name);
    setTitle(t.title);
    setMessage(t.message);
    setImageUrl(t.image_url || "");
    setCategory(t.category);
    setPriority(t.priority);

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
    } else if (dl === "/customer/subscriptions") {
      setDeepLinkType("subscriptions");
    } else if (dl && dl !== "") {
      setDeepLinkType("custom");
      setCustomDeepLink(dl);
    }
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template permanently?")) return;
    setLoading(true);
    try {
      await deleteNotificationTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      router.refresh();
    } catch (err) {
      alert("Delete failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !message.trim()) return;
    setLoading(true);

    try {
      const templateData = {
        id: editId || undefined,
        name,
        title,
        message,
        image_url: imageUrl || undefined,
        category,
        priority,
        deep_link: getResolvedDeepLink(),
      };

      const saved = await saveNotificationTemplate(templateData);
      if (saved) {
        if (editId) {
          setTemplates(prev => prev.map(t => t.id === editId ? saved : t));
        } else {
          setTemplates(prev => [...prev, saved]);
        }
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      alert("Save failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/15 shadow-xs">
        <Link href="/admin/notifications">
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            Back to Notifications
          </Button>
        </Link>

        <Button variant="primary" size="sm" className="text-white text-xs" onClick={handleOpenCreate}>
          <span className="material-symbols-outlined text-[16px] mr-1.5">add</span>
          Create Template
        </Button>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="md:col-span-3 p-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">auto_stories</span>
            </div>
            <p className="text-sm font-bold text-primary mb-1">No templates configured</p>
            <p className="text-xs text-on-surface-variant/60 leading-normal max-w-xs mx-auto">
              Create reusable notification templates to launch alerts or discounts quickly in a single click.
            </p>
          </div>
        ) : (
          templates.map(t => (
            <Card key={t.id} variant="solid" className="p-5 flex flex-col justify-between space-y-4 hover:shadow-ambient transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-xs font-black text-primary font-headline line-clamp-1">{t.name}</h3>
                  <Badge variant="primary" className="text-[8px] tracking-wider py-0.5 leading-none shrink-0">
                    {t.category}
                  </Badge>
                </div>
                <div className="border-t border-outline-variant/10 pt-2.5 space-y-1">
                  <p className="text-[11px] font-black text-primary line-clamp-1">{t.title}</p>
                  <p className="text-[11px] text-on-surface-variant/75 line-clamp-3 leading-relaxed font-semibold">
                    {t.message}
                  </p>
                </div>
                {t.image_url && (
                  <div className="relative aspect-2/1 rounded-lg overflow-hidden border border-outline-variant/20 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                {t.deep_link && (
                  <p className="text-[9px] font-bold text-on-surface-variant/40 block">
                    Deep link: <span className="font-mono">{t.deep_link}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-outline-variant/10 pt-3">
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="px-2.5 py-1.5 border border-outline-variant/30 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-2.5 py-1.5 border border-outline-variant/30 text-on-surface-variant hover:text-error text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-error/5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                  Delete
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ─── CREATE / EDIT MODAL DRAWER ─── */}
      {isOpen && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs flex items-center justify-center z-100 p-4">
          <Card variant="solid" className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
              <h3 className="text-base font-bold text-primary font-headline">
                {editId ? "Edit Notification Template" : "Create Notification Template"}
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Template Name */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Template Identity Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day Festival Discount Alert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Celebrate Freedom with 25% Off!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Notification Message Body *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Avail our special independence day home cleaning coupons..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary resize-none"
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
                    className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
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
                    className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Deep Link */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase block mb-1">
                  Destination / Deep Link
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={deepLinkType}
                    onChange={(e) => setDeepLinkType(e.target.value)}
                    className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
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

                  {deepLinkType === "service" && (
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                    >
                      <option value="">-- Choose Service --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>[{s.category.toUpperCase()}] {s.title}</option>
                      ))}
                    </select>
                  )}

                  {deepLinkType === "category" && (
                    <select
                      value={selectedCategoryName}
                      onChange={(e) => setSelectedCategoryName(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                    >
                      <option value="">-- Choose Category --</option>
                      <option value="pest-control">Pest Control</option>
                      <option value="cleaning-and-housekeeping">Cleaning & Housekeeping</option>
                      <option value="salon-at-home">Salon At Home</option>
                      <option value="appliance-repair">Appliance Repair</option>
                    </select>
                  )}

                  {deepLinkType === "custom" && (
                    <input
                      type="text"
                      required
                      placeholder="e.g. phs://custom/url"
                      value={customDeepLink}
                      onChange={(e) => setCustomDeepLink(e.target.value)}
                      className="w-full p-2.5 bg-surface rounded-xl border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:border-secondary"
                    />
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-white text-xs px-6"
                  disabled={loading || !name.trim() || !title.trim() || !message.trim()}
                >
                  {loading ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
