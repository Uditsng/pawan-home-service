"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateSettingsAction } from "./actions";
import { formatFreeWindowLabel } from "@/utils/bookingPolicy";

import { DemandAnalyticsData } from "./actions";

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Commission Engine Card */}
        <Card variant="solid" className="space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">percent</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Commission</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform Commission (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={platformCommission}
                  onChange={(e) => setPlatformCommission(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Professional Payout Share</label>
                <input
                  type="text"
                  value={`${Math.max(0, 100 - (parseFloat(platformCommission) || 0))}%`}
                  disabled
                  className="w-full p-3.5 rounded-xl bg-surface-container border border-outline-variant/25 text-sm font-bold text-on-surface-variant/70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase">Applies immediately to upcoming services & professional payouts.</p>
        </Card>

        {/* Tax & Currency (GST) */}
        <Card variant="solid" className="space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-primary font-headline">GST / Taxes</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform GST Rate (%)</label>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${gstEnabled ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
                    {gstEnabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <input
                  type="text"
                  value={taxRate}
                  disabled={!gstEnabled}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className={`w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all ${!gstEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase">
            {gstEnabled ? "GST applies across single & cart checkouts." : "GST is globally disabled (0% applied)."}
          </p>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Free Cancellation Window (minutes)</label>
                <label className="text-[10px] font-semibold text-on-surface-variant/40 -mt-1 block">Full auto-refund for cancellations within this window ({formatFreeWindowLabel(cancellationWindowMinutes)}).</label>
                <input
                  type="number"
                  min="1"
                  value={cancellationWindowMinutes}
                  onChange={(e) => setCancellationWindowMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Professional Penalty Rate</label>
                <input
                  type="text"
                  value={penaltyRate}
                  onChange={(e) => setPenaltyRate(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40 mt-4 uppercase">Professional rejections affect cancellation rates.</p>
        </Card>

        {/* Service Zones & Live Pincodes */}
        <Card variant="solid" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">map</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Live Cities & Pincodes</h3>
              <p className="text-[10px] text-on-surface-variant font-medium">Admin decides live service locations (overrides partner locations).</p>
            </div>
          </div>

          {/* Active Cities */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Live Cities</label>
            <div className="flex flex-wrap gap-2 min-h-12 content-start">
              {serviceAreas.map(city => (
                <span
                  key={city}
                  className="px-3.5 py-1.5 rounded-xl bg-surface border border-outline-variant/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer group"
                  onClick={() => handleRemoveCity(city)}
                  title="Remove city"
                >
                  {city}
                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant group-hover:text-red-500 font-bold">close</span>
                </span>
              ))}
              {serviceAreas.length === 0 && (
                <p className="text-xs text-on-surface-variant/40 font-semibold italic p-1">No active cities.</p>
              )}
            </div>
            <form onSubmit={handleAddCity} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="e.g. Lucknow"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#0F172A] active:scale-95 transition-all shadow-md cursor-pointer"
              >
                + Add City
              </button>
            </form>
          </div>

          {/* Active Pincodes */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/15">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70">Live Pincodes</label>
            <div className="flex flex-wrap gap-2 min-h-12 content-start">
              {serviceablePincodes.map(pin => (
                <span
                  key={pin}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer group font-mono"
                  onClick={() => handleRemovePincode(pin)}
                  title="Remove pincode"
                >
                  {pin}
                  <span className="material-symbols-outlined text-[12px] text-emerald-800 group-hover:text-red-500 font-bold">close</span>
                </span>
              ))}
              {serviceablePincodes.length === 0 && (
                <p className="text-xs text-on-surface-variant/40 font-semibold italic p-1">No specific pincodes added (all pincodes in live cities are active).</p>
              )}
            </div>
            <form onSubmit={handleAddPincode} className="flex gap-2 pt-1">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit Pincode (e.g. 226010)"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                + Add Pin
              </button>
            </form>
          </div>
        </Card>
      </div>

      {/* Referral Program Card */}
      <Card variant="solid" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">volunteer_activism</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Referral Program</h3>
              <p className="text-xs text-on-surface-variant font-medium">Configure referrer reward and friend checkout discount parameters (default 50-50 split).</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={referralEnabled}
              onChange={(e) => setReferralEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Referrer Reward (₹)</label>
            <input
              type="number"
              min="0"
              disabled={!referralEnabled}
              value={referralRewardReferrer}
              onChange={(e) => setReferralRewardReferrer(e.target.value)}
              className={`w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <p className="text-[10px] text-on-surface-variant/50 font-medium">Credited to referrer on friend&apos;s first completed booking.</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Referred Friend Discount (₹)</label>
            <input
              type="number"
              min="0"
              disabled={!referralEnabled}
              value={referralRewardReferred}
              onChange={(e) => setReferralRewardReferred(e.target.value)}
              className={`w-full p-3.5 rounded-xl bg-surface border border-outline-variant/20 text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <p className="text-[10px] text-on-surface-variant/50 font-medium">Discount applied to friend&apos;s first booking checkout.</p>
          </div>
        </div>
      </Card>

      {/* Customer Demand Analytics Card */}
      <Card variant="solid" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#059669]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-primary font-headline">Customer Demand & Notify Me Requests</h3>
              <p className="text-xs text-on-surface-variant font-medium">Track unserviceable locations where customers are requesting PHS services.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold">
            {demandAnalytics.totalRequests} Total Interest Requests
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Requested Pincodes */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/70">Top Requested Pincodes</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {demandAnalytics.topPincodes.map((item) => (
                <div
                  key={item.pincode}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline-variant/15 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">pin_drop</span>
                    <span className="font-mono font-bold text-primary">{item.pincode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-primary font-bold text-[11px]">
                      {item.count} {item.count === 1 ? "request" : "requests"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!serviceablePincodes.includes(item.pincode)) {
                          setServiceablePincodes([...serviceablePincodes, item.pincode]);
                        }
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      + Make Live
                    </button>
                  </div>
                </div>
              ))}
              {demandAnalytics.topPincodes.length === 0 && (
                <p className="text-xs text-on-surface-variant/50 italic py-4">No notify requests recorded yet.</p>
              )}
            </div>
          </div>

          {/* Recent Interest Requests Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant/70">Recent Requests Log</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {demandAnalytics.recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline-variant/15 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-primary">{req.pincode}</span>
                    {req.city && <span className="text-on-surface-variant text-[11px] ml-2">({req.city})</span>}
                  </div>
                  <span className="text-[10px] text-on-surface-variant/60">
                    {new Date(req.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {demandAnalytics.recentRequests.length === 0 && (
                <p className="text-xs text-on-surface-variant/50 italic py-4">No recent interest logs.</p>
              )}
            </div>
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
