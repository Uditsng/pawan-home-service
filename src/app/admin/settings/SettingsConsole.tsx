"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateSettingsAction } from "./actions";

interface SettingsConsoleProps {
  initialTaxRate: string;
  initialCancellationWindow: string;
  initialPenaltyRate: string;
  initialServiceAreas: string[];
  initialReferralRewardReferrer: string;
  initialReferralRewardReferred: string;
}

export function SettingsConsole({
  initialTaxRate,
  initialCancellationWindow,
  initialPenaltyRate,
  initialServiceAreas,
  initialReferralRewardReferrer,
  initialReferralRewardReferred,
}: SettingsConsoleProps) {
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [cancellationWindow, setCancellationWindow] = useState(initialCancellationWindow);
  const [penaltyRate, setPenaltyRate] = useState(initialPenaltyRate);
  const [serviceAreas, setServiceAreas] = useState<string[]>(initialServiceAreas);
  const [referralRewardReferrer, setReferralRewardReferrer] = useState(initialReferralRewardReferrer);
  const [referralRewardReferred, setReferralRewardReferred] = useState(initialReferralRewardReferred);
  const [newCity, setNewCity] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim()) return;
    if (serviceAreas.some(city => city.toLowerCase() === newCity.trim().toLowerCase())) {
      setNewCity("");
      return;
    }
    setServiceAreas([...serviceAreas, newCity.trim()]);
    setNewCity("");
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setServiceAreas(serviceAreas.filter(city => city !== cityToRemove));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");
    try {
      await updateSettingsAction({
        tax_rate: taxRate,
        free_cancellation_window: cancellationWindow,
        partner_penalty_rate: penaltyRate,
        service_areas: serviceAreas,
        referral_reward_referrer: referralRewardReferrer,
        referral_reward_referred: referralRewardReferred,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-[20px] p-5 shadow-sm flex items-start gap-4 text-red-600 animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-xl">error</span>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight">Operation Failed</h4>
            <p className="text-xs mt-1 font-semibold leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-[20px] p-5 shadow-sm flex items-center gap-4 text-secondary animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-xl">check_circle</span>
          <div>
            <h4 className="text-sm font-black uppercase tracking-tight">Success</h4>
            <p className="text-xs mt-1 font-semibold leading-relaxed">Platform system rules updated successfully.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tax & Currency */}
        <Card variant="solid" className="space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Tax & Currency</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform Tax (GST)</label>
                <input
                  type="text"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Default Currency</label>
                <input
                  type="text"
                  defaultValue="INR (₹)"
                  disabled
                  className="w-full p-3.5 rounded-xl bg-surface-container border border-outline-variant/25 text-sm font-bold text-on-surface-variant/70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase">GST values apply strictly on payment checkout invoices.</p>
        </Card>

        {/* Cancellation Rules */}
        <Card variant="solid" className="space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">event_busy</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Cancellation Rules</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Free Cancellation Window</label>
                <input
                  type="text"
                  value={cancellationWindow}
                  onChange={(e) => setCancellationWindow(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Partner Penalty Rate</label>
                <input
                  type="text"
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase">Partner rejections affect internal cancellation rates.</p>
        </Card>

        {/* Service Zones */}
        <Card variant="solid" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">map</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Service Areas</h3>
          </div>

          <div className="flex flex-wrap gap-2 min-h-24 content-start">
            {serviceAreas.map(city => (
              <span
                key={city}
                className="px-3.5 py-2 rounded-xl bg-surface border border-outline-variant/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer group"
                onClick={() => handleRemoveCity(city)}
                title="Remove city"
              >
                {city}
                <span className="material-symbols-outlined text-[12px] text-on-surface-variant group-hover:text-red-500 font-bold">close</span>
              </span>
            ))}
            {serviceAreas.length === 0 && (
              <p className="text-xs text-on-surface-variant/40 font-semibold italic p-2">No active cities. Platform bookings will fail coverage checks.</p>
            )}
          </div>

          <form onSubmit={handleAddCity} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Roorkee"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0F172A] active:scale-95 transition-all shadow-md"
            >
              + Add City
            </button>
          </form>
        </Card>
      </div>

      {/* Referral Program */}
      <Card variant="solid" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">volunteer_activism</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Referral Program</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Referrer Reward (₹)</label>
            <input
              type="number"
              min="0"
              value={referralRewardReferrer}
              onChange={(e) => setReferralRewardReferrer(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
            />
            <p className="text-[10px] text-on-surface-variant/50 font-medium">Credited to referrer on friend&apos;s first booking.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Referred Friend Discount (₹)</label>
            <input
              type="number"
              min="0"
              value={referralRewardReferred}
              onChange={(e) => setReferralRewardReferred(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
            />
            <p className="text-[10px] text-on-surface-variant/50 font-medium">Discount applied to friend&apos;s first booking checkout.</p>
          </div>
        </div>
      </Card>


      {/* Floating Save Banner */}
      <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 shadow-md">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
          <p className="text-xs font-bold text-on-surface-variant/80">Pending updates will save instantly to public rules.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="shadow-lg shadow-primary/20 px-8"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
