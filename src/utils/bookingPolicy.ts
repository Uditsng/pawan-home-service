/**
 * Customer booking mutation policy — UX/display only.
 *
 * The database (SECURITY DEFINER RPCs) is the authoritative enforcement layer.
 * These helpers exist purely so the UI shows the correct buttons, refund
 * banners, and policy copy before a real mutation is attempted.
 */

export const CAN_CANCEL_STATUSES: ReadonlyArray<string> = [
  "pending",
  "confirmed",
  "assigned",
  "accepted",
  "reassigned",
];

export const CAN_RESCHEDULE_STATUSES: ReadonlyArray<string> = [
  "pending",
  "confirmed",
  "assigned",
  "accepted",
  "reassigned",
];

export const TERMINAL_STATUSES: ReadonlyArray<string> = [
  "completed",
  "cancelled",
  "expired",
  "refunded",
];

export function isCancellableStatus(status: string): boolean {
  return CAN_CANCEL_STATUSES.includes(status);
}

export function isReschedulableStatus(status: string): boolean {
  return CAN_RESCHEDULE_STATUSES.includes(status);
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * True when the booking was placed within the free-cancellation window.
 * `windowMinutes` comes from the admin-controlled numeric setting.
 */
export function isWithinFreeWindow(createdAt: string, windowMinutes: number): boolean {
  if (!createdAt || !Number.isFinite(windowMinutes) || windowMinutes <= 0) return false;
  const elapsedMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  return elapsedMinutes <= windowMinutes;
}

export interface CancellationRefundTier {
  eligible: boolean;
  tier: "full_refund" | "partial_refund" | "non_refundable";
  refundPercentage: number;
  cancellationFeePercentage: number;
  message: string;
}

/**
 * Authoritative client-side preview of the 3-tier cancellation refund policy.
 * - Tier 1 (Grace Period): Within windowMinutes of creation -> 100% refund
 * - Tier 2 (Advance Cancellation): At least 30 min before scheduled service -> 90% refund (10% fee)
 * - Tier 3 (Late Cancellation): Less than 30 min before service -> 0% refund
 */
export function evaluateCancellationRefund(
  createdAt: string,
  scheduledDate: string | null | undefined,
  windowMinutes: number = 15
): CancellationRefundTier {
  const now = Date.now();
  const createdTime = new Date(createdAt).getTime();
  const elapsedMinutes = (now - createdTime) / 60000;

  // Tier 1: Instant free grace window after placing order
  if (Number.isFinite(windowMinutes) && windowMinutes > 0 && elapsedMinutes <= windowMinutes) {
    return {
      eligible: true,
      tier: "full_refund",
      refundPercentage: 100,
      cancellationFeePercentage: 0,
      message: `You are within the ${formatFreeWindowLabel(windowMinutes)} free grace period. Your full payment will be refunded to your wallet.`,
    };
  }

  // Check scheduled service date
  if (scheduledDate) {
    const serviceTime = new Date(scheduledDate).getTime();
    const minutesUntilService = (serviceTime - now) / 60000;

    // Tier 2: At least 30 minutes before service
    if (minutesUntilService >= 30) {
      return {
        eligible: true,
        tier: "partial_refund",
        refundPercentage: 90,
        cancellationFeePercentage: 10,
        message: "You are cancelling more than 30 minutes before service. A 90% refund will be credited to your wallet (10% cancellation fee applies).",
      };
    }
  }

  // Tier 3: Late cancellation (within 30 min of service or past)
  return {
    eligible: false,
    tier: "non_refundable",
    refundPercentage: 0,
    cancellationFeePercentage: 100,
    message: "The service is scheduled within 30 minutes. As our Professional is preparing or en route, no refund will be issued.",
  };
}

/** Humanize e.g. 15 -> "15 Minutes", 120 -> "2 Hours", 1440 -> "1 Day". */
export function formatFreeWindowLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "15 Minutes";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} Day${days > 1 ? "s" : ""}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} Hour${hours > 1 ? "s" : ""}`;
  }
  return `${minutes} Minutes`;
}