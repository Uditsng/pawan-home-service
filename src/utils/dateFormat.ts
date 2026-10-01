export const IST_TIMEZONE = "Asia/Kolkata";

export const DATE_FORMAT_OPTIONS = {
  dateOnly: {
    timeZone: IST_TIMEZONE,
    year: "numeric" as const,
    month: "short" as const,
    day: "numeric" as const,
  },
  dateTime: {
    timeZone: IST_TIMEZONE,
    year: "numeric" as const,
    month: "short" as const,
    day: "numeric" as const,
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: true as const,
  },
  dateTimeFull: {
    timeZone: IST_TIMEZONE,
    year: "numeric" as const,
    month: "long" as const,
    day: "numeric" as const,
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: true as const,
  },
  timeOnly: {
    timeZone: IST_TIMEZONE,
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: true as const,
  },
  csvDate: {
    timeZone: IST_TIMEZONE,
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
  },
  isoDateTime: {
    timeZone: IST_TIMEZONE,
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
    hour: "2-digit" as const,
    minute: "2-digit" as const,
    hour12: false as const,
  },
};

export function formatInIST(
  isoString: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = DATE_FORMAT_OPTIONS.dateTime
): string {
  if (!isoString) return "—";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString("en-IN", options);
}

export function formatBookingCreatedAt(isoString: string | Date | null | undefined): string {
  return formatInIST(isoString, DATE_FORMAT_OPTIONS.dateTime);
}

export function formatBookingScheduledDate(isoString: string | Date | null | undefined): string {
  return formatInIST(isoString, DATE_FORMAT_OPTIONS.dateTime);
}

export function formatBookingScheduledDateOnly(isoString: string | Date | null | undefined): string {
  return formatInIST(isoString, DATE_FORMAT_OPTIONS.dateOnly);
}

export function formatBookingTimeOnly(isoString: string | Date | null | undefined): string {
  return formatInIST(isoString, DATE_FORMAT_OPTIONS.timeOnly);
}

export function formatForCSV(isoString: string | Date | null | undefined): string {
  if (!isoString) return "";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-CA", DATE_FORMAT_OPTIONS.csvDate).replace(",", " ");
}

export function formatISODateTime(isoString: string | Date | null | undefined): string {
  if (!isoString) return "";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const parts = date.toLocaleString("en-CA", DATE_FORMAT_OPTIONS.isoDateTime).split(", ");
  return `${parts[0]}T${parts[1]}`;
}

export function formatForDateTimeLocal(isoString: string | Date | null | undefined): string {
  if (!isoString) return "";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(", ", "T");
}

export function formatRelativeTime(isoString: string | Date | null | undefined): string {
  if (!isoString) return "—";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatBookingCreatedAt(date);
}

export function formatNotificationTime(isoString: string | Date | null | undefined): string {
  if (!isoString) return "—";
  const date = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid Date";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatBookingCreatedAt(date);
}