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