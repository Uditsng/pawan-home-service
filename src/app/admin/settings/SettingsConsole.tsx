"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateSettingsAction, type DemandAnalyticsData } from "./actions";
import { formatFreeWindowLabel } from "@/utils/bookingPolicy";

interface SettingsConsoleProps {
  initialPlatformCommission: string;
  initialTaxRate: string;
  initialGstEnabled: boolean;
  initialReferralEnabled: boolean;
  initialCancellationWindowMinutes: number;
  initialPenaltyRate: string;
  initialServiceAreas: string[];
  initialServiceablePincodes?: string[];
  initialReferralRewardReferrer: string;
  initialReferralRewardReferred: string;
  demandAnalytics?: DemandAnalyticsData;
}

export function SettingsConsole({
  initialPlatformCommission,
  initialTaxRate,
  initialGstEnabled,
  initialReferralEnabled,
  initialCancellationWindowMinutes,
  initialPenaltyRate,
  initialServiceAreas,
  initialServiceablePincodes = [],
  initialReferralRewardReferrer,
  initialReferralRewardReferred,
  demandAnalytics = { topPincodes: [], recentRequests: [], totalRequests: 0 },
}: SettingsConsoleProps) {
  const [platformCommission, setPlatformCommission] = useState(initialPlatformCommission);
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [gstEnabled, setGstEnabled] = useState(initialGstEnabled);
  const [referralEnabled, setReferralEnabled] = useState(initialReferralEnabled);
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(initialCancellationWindowMinutes);
  const [penaltyRate, setPenaltyRate] = useState(initialPenaltyRate);
  const [serviceAreas, setServiceAreas] = useState<string[]>(initialServiceAreas);
  const [serviceablePincodes, setServiceablePincodes] = useState<string[]>(initialServiceablePincodes);
  const [referralRewardReferrer, setReferralRewardReferrer] = useState(initialReferralRewardReferrer);
  const [referralRewardReferred, setReferralRewardReferred] = useState(initialReferralRewardReferred);
  const [newCity, setNewCity] = useState("");
  const [newPincode, setNewPincode] = useState("");

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

  const handleAddPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = newPincode.trim();
    if (!pin || !/^\d{6}$/.test(pin)) return;
    if (serviceablePincodes.includes(pin)) {
      setNewPincode("");
      return;
    }
    setServiceablePincodes([...serviceablePincodes, pin]);
    setNewPincode("");
  };

  const handleRemovePincode = (pinToRemove: string) => {
    setServiceablePincodes(serviceablePincodes.filter(pin => pin !== pinToRemove));
  };

  const handleMakePincodeLive = (pin: string) => {
    if (!serviceablePincodes.includes(pin)) {
      setServiceablePincodes([...serviceablePincodes, pin]);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage("");
    try {
      await updateSettingsAction({
        platform_commission: platformCommission,
        tax_rate: taxRate,
        gst_enabled: gstEnabled,
        referral_enabled: referralEnabled,
        free_cancellation_window_minutes: cancellationWindowMinutes,
        free_cancellation_window: formatFreeWindowLabel(cancellationWindowMinutes),
        partner_penalty_rate: penaltyRate,
        service_areas: serviceAreas,
        serviceable_pincodes: serviceablePincodes,
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
      {/* Operation Feedback Alerts */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-600 animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-lg">error</span>
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider">Operation Failed</h4>
            <p className="text-xs mt-0.5 font-medium leading-normal">{errorMessage}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-lg">check_circle</span>
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider">Settings Saved</h4>
            <p className="text-xs mt-0.5 font-medium leading-normal">Platform system rules updated successfully.</p>
          </div>
        </div>
      )}

      {/* Row 1: 3 Adjacent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Commission Engine */}
        <Card variant="solid" className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-lg">percent</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-primary font-headline">Commission</h3>
                  <p className="text-[10px] text-on-surface-variant/60 font-medium">Platform cut per job</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Platform Fee (%)</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={platformCommission}
                    onChange={(e) => setPlatformCommission(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                  />
                  <span className="absolute right-3 text-xs font-bold text-on-surface-variant/50">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Pro Payout Share</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={`${Math.max(0, 100 - (parseFloat(platformCommission) || 0))}`}
                    disabled
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface-variant/70 cursor-not-allowed"
                  />
                  <span className="absolute right-3 text-xs font-bold text-on-surface-variant/50">%</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 pt-2 border-t border-outline-variant/10 uppercase">
            Auto-deducted during partner payout calculation.
          </p>
        </Card>

        {/* Card 2: GST / Taxes */}
        <Card variant="solid" className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-primary font-headline">GST & Taxes</h3>
                  <p className="text-[10px] text-on-surface-variant/60 font-medium">Checkout tax rules</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">GST Rate (%)</label>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${gstEnabled ? 'bg-emerald-500/10 text-emerald-800' : 'bg-red-500/10 text-red-700'}`}>
                    {gstEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={taxRate}
                    disabled={!gstEnabled}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className={`w-full pl-3 pr-8 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all ${!gstEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <span className="absolute right-3 text-xs font-bold text-on-surface-variant/50">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Default Currency</label>
                <input
                  type="text"
                  defaultValue="INR (₹)"
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface-variant/70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 pt-2 border-t border-outline-variant/10 uppercase">
            {gstEnabled ? "Applied dynamically across customer checkouts." : "Globally disabled (0% tax applied)."}
          </p>
        </Card>

        {/* Card 3: Cancellation Rules */}
        <Card variant="solid" className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-lg">event_busy</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-primary font-headline">Cancellation Rules</h3>
                  <p className="text-[10px] text-on-surface-variant/60 font-medium">Refund & penalty window</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Free Cancel Window</label>
                  <span className="text-[10px] font-bold text-secondary">{formatFreeWindowLabel(cancellationWindowMinutes)}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={cancellationWindowMinutes}
                    onChange={(e) => setCancellationWindowMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                  />
                  <span className="absolute right-3 text-[11px] font-bold text-on-surface-variant/50">min</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Pro Penalty Rate</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-on-surface-variant/50">₹</span>
                  <input
                    type="text"
                    value={penaltyRate}
                    onChange={(e) => setPenaltyRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/50 pt-2 border-t border-outline-variant/10 uppercase">
            Auto-refund applies within the free cancellation window.
          </p>
        </Card>
      </div>

      {/* Row 2: Live Cities & Pincodes Card (Placed below the 3 adjacent cards) */}
      <Card variant="solid" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-primary font-headline">Service Zones & Live Coverage</h3>
              <p className="text-xs text-on-surface-variant font-medium">Define active operating cities and serviceable pincodes for auto-assignment.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {serviceAreas.length} {serviceAreas.length === 1 ? "City" : "Cities"} Active
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold">
              {serviceablePincodes.length} {serviceablePincodes.length === 1 ? "Pincode" : "Pincodes"} Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Cities Section */}
          <div className="space-y-3 bg-surface/60 p-4 rounded-2xl border border-outline-variant/15 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">location_city</span>
                  <label className="text-xs font-black uppercase tracking-wider text-primary">Live Active Cities</label>
                </div>
                <span className="text-[10px] text-on-surface-variant/60 font-medium">Click badge to remove</span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-20 p-2.5 rounded-xl bg-surface border border-outline-variant/15 content-start max-h-48 overflow-y-auto">
                {serviceAreas.map(city => (
                  <span
                    key={city}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group shadow-2xs"
                    onClick={() => handleRemoveCity(city)}
                    title="Click to remove city"
                  >
                    {city}
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant/70 group-hover:text-red-500 font-bold">close</span>
                  </span>
                ))}
                {serviceAreas.length === 0 && (
                  <p className="text-xs text-on-surface-variant/50 font-medium italic p-2">No active cities configured.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddCity} className="flex gap-2 pt-2 border-t border-outline-variant/10">
              <input
                type="text"
                placeholder="Enter city name (e.g. Lucknow)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary/90 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              >
                + Add City
              </button>
            </form>
          </div>

          {/* Active Pincodes Section */}
          <div className="space-y-3 bg-surface/60 p-4 rounded-2xl border border-outline-variant/15 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-base">pin_drop</span>
                  <label className="text-xs font-black uppercase tracking-wider text-primary">Live Service Pincodes</label>
                </div>
                <span className="text-[10px] text-on-surface-variant/60 font-medium">Click badge to remove</span>
              </div>

              <div className="flex flex-wrap gap-2 min-h-20 p-2.5 rounded-xl bg-surface border border-outline-variant/15 content-start max-h-48 overflow-y-auto">
                {serviceablePincodes.map(pin => (
                  <span
                    key={pin}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 text-xs font-bold tracking-wider flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group font-mono shadow-2xs"
                    onClick={() => handleRemovePincode(pin)}
                    title="Click to remove pincode"
                  >
                    {pin}
                    <span className="material-symbols-outlined text-[14px] text-emerald-800 group-hover:text-red-500 font-bold">close</span>
                  </span>
                ))}
                {serviceablePincodes.length === 0 && (
                  <p className="text-xs text-on-surface-variant/50 font-medium italic p-2">No specific pincodes added (all pincodes in live cities are active).</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddPincode} className="flex gap-2 pt-2 border-t border-outline-variant/10">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit pincode (e.g. 226010)"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 px-3.5 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-800 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              >
                + Add Pincode
              </button>
            </form>
          </div>
        </div>
      </Card>

      {/* Row 3: Referral Program Card */}
      <Card variant="solid" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">volunteer_activism</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-primary font-headline">Referral & Wallet Incentives</h3>
              <p className="text-xs text-on-surface-variant font-medium">Configure referrer cashback and friend checkout discount parameters.</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={referralEnabled}
              onChange={(e) => setReferralEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Referrer Reward (₹)</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-on-surface-variant/50">₹</span>
              <input
                type="number"
                min="0"
                disabled={!referralEnabled}
                value={referralRewardReferrer}
                onChange={(e) => setReferralRewardReferrer(e.target.value)}
                className={`w-full pl-7 pr-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <p className="text-[10px] text-on-surface-variant/60 font-medium pt-0.5">Credited to referrer wallet on friend&apos;s first completed booking.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Referred Friend Discount (₹)</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-on-surface-variant/50">₹</span>
              <input
                type="number"
                min="0"
                disabled={!referralEnabled}
                value={referralRewardReferred}
                onChange={(e) => setReferralRewardReferred(e.target.value)}
                className={`w-full pl-7 pr-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <p className="text-[10px] text-on-surface-variant/60 font-medium pt-0.5">Discount applied automatically at friend&apos;s checkout.</p>
          </div>
        </div>
      </Card>

      {/* Row 4: Customer Demand Analytics Card */}
      <Card variant="solid" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 shrink-0">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-primary font-headline">Customer Demand & Notify Requests</h3>
              <p className="text-xs text-on-surface-variant font-medium">Monitor interest logs submitted by customers in unserviceable locations.</p>
            </div>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold shrink-0 self-start sm:self-auto">
            {demandAnalytics.totalRequests} Interest Requests
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Requested Pincodes */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/80">Top Requested Pincodes</h4>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {demandAnalytics.topPincodes.map((item) => {
                const isAlreadyLive = serviceablePincodes.includes(item.pincode);
                return (
                  <div
                    key={item.pincode}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-outline-variant/15 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base">pin_drop</span>
                      <span className="font-mono font-bold text-primary">{item.pincode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-primary font-bold text-[11px]">
                        {item.count} {item.count === 1 ? "request" : "requests"}
                      </span>
                      {isAlreadyLive ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Live
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMakePincodeLive(item.pincode)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          + Make Live
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {demandAnalytics.topPincodes.length === 0 && (
                <p className="text-xs text-on-surface-variant/50 italic py-3">No notify requests recorded yet.</p>
              )}
            </div>
          </div>

          {/* Recent Interest Requests Table */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/80">Recent Requests Log</h4>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {demandAnalytics.recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-outline-variant/15 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{req.pincode}</span>
                    {req.city && <span className="text-on-surface-variant text-[11px]">({req.city})</span>}
                  </div>
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">
                    {new Date(req.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {demandAnalytics.recentRequests.length === 0 && (
                <p className="text-xs text-on-surface-variant/50 italic py-3">No recent interest logs.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Floating Save Banner */}
      <div className="sticky bottom-4 z-10 flex justify-between items-center bg-surface-container-lowest/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0"></span>
          <p className="text-xs font-bold text-on-surface-variant/80">Changes apply to live platform rules instantly.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="shadow-md shadow-primary/20 px-6 sm:px-8 py-2 text-xs font-bold"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}


