"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Coupon } from "@/lib/types";

export type CouponFormState = {
  type: "success" | "error" | null;
  message: string | null;
};

interface ServiceOption {
  id: string;
  title: string;
}

interface CouponFormProps {
  action: (prevState: CouponFormState, formData: FormData) => Promise<CouponFormState>;
  services: ServiceOption[];
  coupon?: Coupon | null;
  isEdit?: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const fieldClass =
  "w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-outline-variant/20 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-60 disabled:bg-surface-container-low";
const labelClass = "block text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5";

export function CouponForm({ action, services, coupon, isEdit }: CouponFormProps) {
  const [state, formAction] = useActionState(action, { type: null, message: null });

  return (
    <form action={formAction} className="space-y-6 max-w-4xl">
      {isEdit && coupon && (
        <input type="hidden" name="id" value={coupon.id} />
      )}

      {/* Error State Banner */}
      {state.type === "error" && (
        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined shrink-0 mt-0.5 text-lg">error</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Something Went Wrong</p>
            <p className="text-xs mt-0.5 font-medium">{state.message}</p>
          </div>
        </div>
      )}

      {/* ─── 1. DISCOUNT DETAILS ──────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">local_offer</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Discount Details</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">Enter the coupon code and choose how much discount to offer.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Code */}
          <div>
            <label className={labelClass} htmlFor="code">
              Coupon Code <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="code"
                name="code"
                required
                placeholder="e.g. MONSOON20"
                defaultValue={coupon?.code ?? ""}
                disabled={isEdit}
                className={`${fieldClass} uppercase font-mono font-bold tracking-wider`}
              />
            </div>
            {isEdit && (
              <p className="text-[11px] text-on-surface-variant opacity-70 mt-1">
                You cannot change the code after creating it.
              </p>
            )}
          </div>

          {/* Discount Type */}
          <div>
            <label className={labelClass} htmlFor="discount_type">
              Discount Type <span className="text-error">*</span>
            </label>
            <select
              id="discount_type"
              name="discount_type"
              defaultValue={coupon?.discount_type ?? "percentage"}
              className={fieldClass}
            >
              <option value="percentage">Percentage Off (%)</option>
              <option value="fixed">Fixed Amount Off (₹)</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label className={labelClass} htmlFor="discount_value">
              Discount Amount <span className="text-error">*</span>
            </label>
            <input
              id="discount_value"
              name="discount_value"
              type="number"
              min="0"
              required
              placeholder="e.g. 20 for 20% or 100 for ₹100"
              defaultValue={coupon?.discount_value ?? ""}
              className={fieldClass}
            />
          </div>

          {/* Max Discount Cap */}
          <div>
            <label className={labelClass} htmlFor="max_discount">
              Maximum Discount Amount (₹)
            </label>
            <input
              id="max_discount"
              name="max_discount"
              type="number"
              min="0"
              placeholder="Optional limit for percentage discounts"
              defaultValue={coupon?.max_discount ?? ""}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Caps the maximum discount amount for percentage coupons.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. USAGE RULES & LIMITS ──────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">tune</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Usage Rules & Limits</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">Set minimum order requirements and usage limits.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Min Order Value */}
          <div>
            <label className={labelClass} htmlFor="min_booking_amount">
              Minimum Order Amount (₹)
            </label>
            <input
              id="min_booking_amount"
              name="min_booking_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0 for no minimum amount"
              defaultValue={coupon?.min_booking_amount ?? 0}
              className={fieldClass}
            />
          </div>

          {/* Limit Per User */}
          <div>
            <label className={labelClass} htmlFor="limit_per_user">
              Times Allowed Per Customer
            </label>
            <input
              id="limit_per_user"
              name="limit_per_user"
              type="number"
              min="1"
              defaultValue={coupon?.limit_per_user ?? 1}
              className={fieldClass}
            />
          </div>

          {/* Global Total Limit */}
          <div>
            <label className={labelClass} htmlFor="total_limit">
              Total Times Coupon Can Be Used
            </label>
            <input
              id="total_limit"
              name="total_limit"
              type="number"
              min="1"
              placeholder="Leave empty for unlimited use"
              defaultValue={coupon?.total_limit ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {/* ─── 3. EXPIRY DATE & SERVICE ─────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">event_available</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary font-headline">Expiry Date & Service</h3>
            <p className="text-[11px] text-on-surface-variant opacity-70">Set when this coupon expires and which service it can be used on.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Expiry Date */}
          <div>
            <label className={labelClass} htmlFor="expires_at">
              Expiry Date & Time
            </label>
            <input
              id="expires_at"
              name="expires_at"
              type="datetime-local"
              defaultValue={toLocalInput(coupon?.expires_at ?? null)}
              className={fieldClass}
            />
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Leave empty if this coupon never expires.
            </p>
          </div>

          {/* Applicable Service */}
          <div>
            <label className={labelClass} htmlFor="applicable_to_service_id">
              Which Service Can Use This?
            </label>
            <select
              id="applicable_to_service_id"
              name="applicable_to_service_id"
              defaultValue={coupon?.applicable_to_service_id ?? ""}
              className={fieldClass}
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant opacity-60 mt-1">
              Choose a specific service or let customers use it on any service.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 4. ENABLE COUPON ──────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-outlined text-base">toggle_on</span>
          </div>
          <div>
            <p className="text-xs font-bold text-primary font-headline">Enable Coupon</p>
            <p className="text-[11px] text-on-surface-variant opacity-70">Turn on so customers can use this coupon at checkout.</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            value="on"
            defaultChecked={coupon ? coupon.is_active : true}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
        </label>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          className="bg-primary text-white rounded-xl px-6 py-3 font-bold text-xs uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          size="md"
        >
          {isEdit ? "Save Changes" : "Create Coupon"}
        </Button>
        <a href="/admin/coupons">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="rounded-xl px-6 py-3 border-outline-variant/30 text-on-surface-variant hover:bg-surface-container font-bold text-xs uppercase tracking-widest transition-all"
          >
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}

