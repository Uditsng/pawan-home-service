"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateSettingsAction, type DemandAnalyticsData } from "./actions";
import { formatFreeWindowLabel } from "@/utils/bookingPolicy";
import { type OrderFee } from "@/lib/engines/platformSettingsEngine";

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
  initialOrderFees?: OrderFee[];
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
  initialOrderFees = [],
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
  const [orderFees, setOrderFees] = useState<OrderFee[]>(initialOrderFees);
  const [newCity, setNewCity] = useState("");
  const [newPincode, setNewPincode] = useState("");

  // Order fee inline creator / editor state
  const [isFeeFormOpen, setIsFeeFormOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [feeNameInput, setFeeNameInput] = useState("");
  const [feeAmountInput, setFeeAmountInput] = useState("");
  const [feeEnabledInput, setFeeEnabledInput] = useState(true);
  const [feeFormError, setFeeFormError] = useState("");

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

  const handleOpenAddFee = () => {
    setEditingFeeId(null);
    setFeeNameInput("");
    setFeeAmountInput("");
    setFeeEnabledInput(true);
    setFeeFormError("");
    setIsFeeFormOpen(true);
  };

  const handleStartEditFee = (fee: OrderFee) => {
    setEditingFeeId(fee.id);
    setFeeNameInput(fee.name);
    setFeeAmountInput(String(fee.amount));
    setFeeEnabledInput(fee.enabled);
    setFeeFormError("");
    setIsFeeFormOpen(true);
  };

  const handleCancelFeeForm = () => {
    setIsFeeFormOpen(false);
    setEditingFeeId(null);
    setFeeNameInput("");
    setFeeAmountInput("");
    setFeeFormError("");
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = feeNameInput.trim();
    if (!trimmedName) {
      setFeeFormError("Fee name is required.");
      return;
    }
    const parsedAmount = parseFloat(feeAmountInput);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount < 0) {
      setFeeFormError("Enter a valid positive number.");
      return;
    }

    const roundedAmount = Math.round(parsedAmount * 100) / 100;

    if (editingFeeId) {
      setOrderFees((prev) =>
        prev.map((f) =>
          f.id === editingFeeId
            ? { ...f, name: trimmedName, amount: roundedAmount, enabled: feeEnabledInput }
            : f
        )
      );
    } else {
      const newFee: OrderFee = {
        id: `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmedName,
        amount: roundedAmount,
        enabled: feeEnabledInput,
      };
      setOrderFees((prev) => [...prev, newFee]);
    }

    setIsFeeFormOpen(false);
    setEditingFeeId(null);
    setFeeNameInput("");
    setFeeAmountInput("");
    setFeeFormError("");
  };

  const handleToggleFee = (id: string) => {
    setOrderFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleDeleteFee = (id: string) => {
    setOrderFees((prev) => prev.filter((f) => f.id !== id));
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
        order_fees: orderFees,
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
    <div className="space-y-4 pb-16">
      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2.5 text-red-700 text-xs font-medium animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-base">error</span>
          <span className="flex-1">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage("")} className="hover:opacity-75">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-in fade-in">
          <span className="material-symbols-outlined shrink-0 text-base">check_circle</span>
          <span className="flex-1">Platform settings updated successfully.</span>
        </div>
      )}

      {/* ─── SECTION 1: Core Financial & Platform Rules (2x2 Grid) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Commission Engine */}
        <Card variant="solid" className="p-3.5 flex flex-col justify-between space-y-3 rounded-2xl border-outline-variant/15">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-2">
              <span className="material-symbols-outlined text-primary text-base">percent</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Commission</h3>
                <p className="text-[10px] text-on-surface-variant/60 font-medium">Platform cut per job</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Platform Cut (%)</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={platformCommission}
                    onChange={(e) => setPlatformCommission(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <span className="absolute right-2.5 text-xs font-bold text-on-surface-variant/40">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Pro Payout Share</label>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="text"
                    value={`${Math.max(0, 100 - (parseFloat(platformCommission) || 0))}%`}
                    disabled
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/15 text-xs font-bold text-on-surface-variant/70 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-on-surface-variant/50 pt-1 border-t border-outline-variant/10">Auto-deducted during payouts</p>
        </Card>

        {/* 2. Taxes & GST */}
        <Card variant="solid" className="p-3.5 flex flex-col justify-between space-y-3 rounded-2xl border-outline-variant/15">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">GST & Taxes</h3>
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
                <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">GST Rate (%)</label>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${gstEnabled ? 'bg-emerald-500/10 text-emerald-800' : 'bg-red-500/10 text-red-700'}`}>
                    {gstEnabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="text"
                    value={taxRate}
                    disabled={!gstEnabled}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary ${!gstEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <span className="absolute right-2.5 text-xs font-bold text-on-surface-variant/40">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Currency</label>
                <input
                  type="text"
                  defaultValue="INR (₹)"
                  disabled
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/15 text-xs font-bold text-on-surface-variant/70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <p className="text-[9px] text-on-surface-variant/50 pt-1 border-t border-outline-variant/10">
            {gstEnabled ? "Applied dynamically across cart" : "Globally disabled (0% tax)"}
          </p>
        </Card>

        {/* 3. Cancellation Policy */}
        <Card variant="solid" className="p-3.5 flex flex-col justify-between space-y-3 rounded-2xl border-outline-variant/15">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-2">
              <span className="material-symbols-outlined text-primary text-base">event_busy</span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Cancellation</h3>
                <p className="text-[10px] text-on-surface-variant/60 font-medium">Refund & penalty rules</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Free Window</label>
                  <span className="text-[10px] font-bold text-secondary">{formatFreeWindowLabel(cancellationWindowMinutes)}</span>
                </div>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={cancellationWindowMinutes}
                    onChange={(e) => setCancellationWindowMinutes(Math.max(1, parseInt(e.target.value, 10) || 15))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <span className="absolute right-2.5 text-[10px] font-bold text-on-surface-variant/40">min</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Pro Penalty (₹)</label>
                <div className="relative mt-1 flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-on-surface-variant/40">₹</span>
                  <input
                    type="text"
                    value={penaltyRate}
                    onChange={(e) => setPenaltyRate(e.target.value)}
                    className="w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-on-surface-variant/50 pt-1 border-t border-outline-variant/10">Full refund inside free window</p>
        </Card>

        {/* 4. Referral & Incentives */}
        <Card variant="solid" className="p-3.5 flex flex-col justify-between space-y-3 rounded-2xl border-outline-variant/15">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">card_giftcard</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-primary">Referrals</h3>
                  <p className="text-[10px] text-on-surface-variant/60 font-medium">Growth incentives</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={referralEnabled}
                  onChange={(e) => setReferralEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Referrer Cashback (₹)</label>
                <div className="relative mt-1 flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-on-surface-variant/40">₹</span>
                  <input
                    type="number"
                    min="0"
                    disabled={!referralEnabled}
                    value={referralRewardReferrer}
                    onChange={(e) => setReferralRewardReferrer(e.target.value)}
                    className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase">Friend Discount (₹)</label>
                <div className="relative mt-1 flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-on-surface-variant/40">₹</span>
                  <input
                    type="number"
                    min="0"
                    disabled={!referralEnabled}
                    value={referralRewardReferred}
                    onChange={(e) => setReferralRewardReferred(e.target.value)}
                    className={`w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary ${!referralEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-on-surface-variant/50 pt-1 border-t border-outline-variant/10">Credited on 1st completed job</p>
        </Card>
      </div>

      {/* ─── SECTION 2: Fixed Order Fees (Checkout Level) ─── */}
      <Card variant="solid" className="p-4 space-y-3 rounded-2xl border-outline-variant/15">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">point_of_sale</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Additional Charges</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {orderFees.filter(f => f.enabled).length} of {orderFees.length} Active
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant/60 font-medium">Fixed rupee fees applied at checkout (Platform Fee, Convenience, Rain Fee)</p>
            </div>
          </div>
          {!isFeeFormOpen && (
            <button
              type="button"
              onClick={handleOpenAddFee}
              className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center gap-1 hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Charge
            </button>
          )}
        </div>

        {/* Inline Create / Edit Fee Form */}
        {isFeeFormOpen && (
          <form onSubmit={handleSaveFee} className="p-3 rounded-xl bg-surface border border-secondary/40 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                {editingFeeId ? "Edit Charge" : "New Charge"}
              </span>
              <button
                type="button"
                onClick={handleCancelFeeForm}
                className="text-on-surface-variant/60 hover:text-on-surface text-[11px] font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {feeFormError && (
              <p className="text-[11px] text-red-600 font-bold bg-red-500/10 px-2.5 py-1 rounded-md">{feeFormError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-6">
                <label className="text-[9px] font-bold uppercase text-on-surface-variant/70">Charge Name</label>
                <input
                  type="text"
                  placeholder="e.g. Platform Fee, Convenience Fee"
                  value={feeNameInput}
                  onChange={(e) => setFeeNameInput(e.target.value)}
                  className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  autoFocus
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-[9px] font-bold uppercase text-on-surface-variant/70">Amount (₹)</label>
                <div className="relative mt-0.5 flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-on-surface-variant/40">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="10"
                    value={feeAmountInput}
                    onChange={(e) => setFeeAmountInput(e.target.value)}
                    className="w-full pl-6 pr-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>
              <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={feeEnabledInput}
                    onChange={(e) => setFeeEnabledInput(e.target.checked)}
                    className="rounded border-outline-variant/30 text-secondary focus:ring-secondary"
                  />
                  <span className="text-[11px] font-bold text-on-surface">Active</span>
                </label>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-secondary text-primary font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  {editingFeeId ? "Save" : "Add"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Existing Fees List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {orderFees.map((fee) => (
            <div
              key={fee.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                fee.enabled
                  ? "bg-surface border-outline-variant/20 shadow-2xs"
                  : "bg-surface/50 border-outline-variant/10 opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${fee.enabled ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant/50'}`}>
                  ₹
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-primary text-xs truncate leading-tight">{fee.name}</h4>
                  <p className="text-[11px] font-black text-on-surface-variant mt-0.5">₹{fee.amount}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleFee(fee.id)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    fee.enabled
                      ? "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20"
                      : "bg-surface-container-highest text-on-surface-variant/60 hover:bg-surface-container-high"
                  }`}
                >
                  {fee.enabled ? "Active" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartEditFee(fee)}
                  className="p-1 rounded-md text-on-surface-variant/60 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  title="Edit fee"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFee(fee.id)}
                  className="p-1 rounded-md text-on-surface-variant/60 hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Delete fee"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              </div>
            </div>
          ))}

          {orderFees.length === 0 && !isFeeFormOpen && (
            <div className="col-span-full py-4 text-center rounded-xl border border-dashed border-outline-variant/25 bg-surface/30">
              <p className="text-xs text-on-surface-variant/60 font-medium">No additional charges configured yet. Click &quot;Add Charge&quot; to configure checkout charges.</p>
            </div>
          )}
        </div>
      </Card>

      {/* ─── SECTION 3: Service Zones & Live Pincodes (Compact Side-by-Side) ─── */}
      <Card variant="solid" className="p-4 space-y-3 rounded-2xl border-outline-variant/15">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">map</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Live Service Zones</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {serviceAreas.length} {serviceAreas.length === 1 ? "City" : "Cities"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-bold">
                  {serviceablePincodes.length} {serviceablePincodes.length === 1 ? "Pincode" : "Pincodes"}
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant/60 font-medium">Active cities and postal codes eligible for auto-dispatch</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Active Cities Section */}
          <div className="space-y-2 bg-surface/50 p-3 rounded-xl border border-outline-variant/15 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_city</span>
                  Active Cities ({serviceAreas.length})
                </label>
                <span className="text-[9px] text-on-surface-variant/50">Click tag to remove</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface border border-outline-variant/10 max-h-32 overflow-y-auto content-start">
                {serviceAreas.map(city => (
                  <span
                    key={city}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group shadow-2xs"
                    onClick={() => handleRemoveCity(city)}
                    title="Click to remove"
                  >
                    {city}
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant/50 group-hover:text-red-500 font-bold">close</span>
                  </span>
                ))}
                {serviceAreas.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant/40 italic p-1">No cities configured.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddCity} className="flex gap-1.5 pt-1.5">
              <input
                type="text"
                placeholder="Enter city (e.g. Lucknow)"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer shrink-0"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Active Pincodes Section */}
          <div className="space-y-2 bg-surface/50 p-3 rounded-xl border border-outline-variant/15 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-700">pin_drop</span>
                  Active Pincodes ({serviceablePincodes.length})
                </label>
                <span className="text-[9px] text-on-surface-variant/50">Click tag to remove</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface border border-outline-variant/10 max-h-32 overflow-y-auto content-start font-mono">
                {serviceablePincodes.map(pin => (
                  <span
                    key={pin}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 text-[11px] font-bold tracking-wider flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer group shadow-2xs"
                    onClick={() => handleRemovePincode(pin)}
                    title="Click to remove"
                  >
                    {pin}
                    <span className="material-symbols-outlined text-[12px] text-emerald-800 group-hover:text-red-500 font-bold">close</span>
                  </span>
                ))}
                {serviceablePincodes.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant/40 italic p-1 font-sans">All pincodes in live cities are active.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAddPincode} className="flex gap-1.5 pt-1.5">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit pincode"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/20 text-xs font-bold text-primary outline-none focus:ring-1 focus:ring-secondary font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-800 transition-all cursor-pointer shrink-0"
              >
                + Add
              </button>
            </form>
          </div>
        </div>
      </Card>

      {/* ─── SECTION 4: Customer Demand Log (Compact Strip) ─── */}
      <Card variant="solid" className="p-4 space-y-3 rounded-2xl border-outline-variant/15">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-base">analytics</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Customer Demand & Interest</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-bold">
                  {demandAnalytics.totalRequests} Requests
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant/60 font-medium">Customer notify requests submitted in unserviceable locations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Top Requested Pincodes */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Top Requested Pincodes</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {demandAnalytics.topPincodes.map((item) => {
                const isAlreadyLive = serviceablePincodes.includes(item.pincode);
                return (
                  <div
                    key={item.pincode}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/10 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">pin_drop</span>
                      <span className="font-mono font-bold text-primary text-[11px]">{item.pincode}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.2 rounded-full bg-secondary/15 text-primary font-bold text-[10px]">
                        {item.count} req
                      </span>
                      {isAlreadyLive ? (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Live
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMakePincodeLive(item.pincode)}
                          className="text-[9px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded transition-colors cursor-pointer"
                        >
                          + Make Live
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {demandAnalytics.topPincodes.length === 0 && (
                <p className="text-[11px] text-on-surface-variant/40 italic py-2">No interest requests logged.</p>
              )}
            </div>
          </div>

          {/* Recent Interest Requests Table */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70">Recent Logs</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {demandAnalytics.recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/10 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-primary text-[11px]">{req.pincode}</span>
                    {req.city && <span className="text-on-surface-variant text-[10px]">({req.city})</span>}
                  </div>
                  <span className="text-[9px] text-on-surface-variant/50 font-medium">
                    {new Date(req.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {demandAnalytics.recentRequests.length === 0 && (
                <p className="text-[11px] text-on-surface-variant/40 italic py-2">No recent interest logs.</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Floating Save Action Bar */}
      <div className="sticky bottom-3 z-20 flex justify-between items-center bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-outline-variant/20 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0"></span>
          <p className="text-[11px] font-bold text-on-surface-variant">Changes apply to live platform rules instantly.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="shadow-sm px-6 py-1.5 text-xs font-bold"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}


