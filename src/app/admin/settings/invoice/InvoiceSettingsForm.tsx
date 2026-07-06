"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateInvoiceCompanyProfileAction } from "./actions";
import { InvoiceSeller } from "@/lib/invoice/invoiceTypes";

interface InvoiceSettingsFormProps {
  initialSettings: InvoiceSeller;
}

export default function InvoiceSettingsForm({ initialSettings }: InvoiceSettingsFormProps) {
  const [settings, setSettings] = useState<InvoiceSeller>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");

    try {
      await updateInvoiceCompanyProfileAction(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveChanges} className="space-y-6">
      {errorMessage && (
        <div className="bg-error/10 border border-error/20 rounded-2xl p-5 text-error flex items-start gap-3 animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-xl">error</span>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">Operation Failed</h4>
            <p className="text-xs mt-1 font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-success flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-xl">check_circle</span>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">Success</h4>
            <p className="text-xs mt-1 font-semibold leading-relaxed">Company profile for invoices updated successfully.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Company Details */}
        <Card variant="solid" className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-3">
            <span className="material-symbols-outlined text-primary text-xl">business</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Company Registry Details</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Display Name</label>
              <input
                type="text"
                name="company_name"
                required
                value={settings.company_name}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Legal Entity Name</label>
              <input
                type="text"
                name="legal_name"
                required
                value={settings.legal_name}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Company Tagline / Slogan</label>
              <input
                type="text"
                name="tagline"
                required
                value={settings.tagline}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">GSTIN Registration Number</label>
              <input
                type="text"
                name="gst_number"
                required
                value={settings.gst_number}
                onChange={handleChange}
                maxLength={15}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all font-mono uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Logo URL</label>
              <input
                type="text"
                name="logo_url"
                required
                value={settings.logo_url}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Contact & Support settings */}
        <Card variant="solid" className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-3">
            <span className="material-symbols-outlined text-primary text-xl">contact_mail</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Support & Physical Address</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Support Phone Number</label>
              <input
                type="text"
                name="support_phone"
                required
                value={settings.support_phone}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Support Email Address</label>
              <input
                type="email"
                name="support_email"
                required
                value={settings.support_email}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Company Website</label>
              <input
                type="text"
                name="website"
                required
                value={settings.website}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Office Address</label>
              <textarea
                name="address"
                required
                rows={2}
                value={settings.address}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Invoice Disclaimer / Footer Text</label>
              <input
                type="text"
                name="footer_text"
                required
                value={settings.footer_text}
                onChange={handleChange}
                className="w-full p-3 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isSaving}
          className="px-6 py-3 rounded-xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">save</span>
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
