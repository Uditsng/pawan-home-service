/**
 * Centralized formatting helpers for invoices.
 */

/**
 * Formats a number to currency format (e.g. ₹999 or ₹1,250.50).
 * Decimals are omitted unless paise specifically matters.
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded % 1 === 0) {
    return `₹${Math.floor(rounded).toLocaleString("en-IN")}`;
  }
  return `₹${rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats an ISO date string or Date object into a readable local date (Asia/Kolkata).
 * Output example: "Mon, 12 May 2026"
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Formats an ISO date string or Date object into a readable local time (Asia/Kolkata).
 * Output example: "10:00 AM"
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Concatenates local date and time.
 * Output example: "Mon, 12 May 2026 · 10:00 AM"
 */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}
