export const IST_OFFSET = "+05:30";

/**
 * Operating-hours configuration for booking time slots. Driven entirely by the
 * `booking_schedule_config` row in `public.platform_settings` so operators can
 * change opening hours / slot intervals from the Supabase Dashboard without a
 * code deploy. `endHour` is INCLUSIVE (the final slot of the day is
 * `endHour:00`).
 */
export interface BookingScheduleConfig {
  /** First bookable hour of the day (0-23). */
  startHour: number;
  /** Last bookable hour of the day (0-23), inclusive. */
  endHour: number;
  /** Slot cadence in minutes (e.g. 30, 45, 60). */
  intervalMinutes: number;
  /** Slots at/after this hour are grouped under "Afternoon" in the UI. */
  afternoonStartHour: number;
}

export const DEFAULT_SCHEDULE_CONFIG: BookingScheduleConfig = {
  startHour: 7,
  endHour: 21,
  intervalMinutes: 30,
  afternoonStartHour: 12,
};

/**
 * Sanitise a raw (JSONB) schedule config value. Any missing / malformed /
 * out-of-range field falls back to the legacy defaults so broken rows can
 * never break the booking UI.
 */
export function normalizeScheduleConfig(raw: unknown): BookingScheduleConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SCHEDULE_CONFIG };
  }

  const obj = raw as Record<string, unknown>;
  const toInt = (v: unknown): number => {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isInteger(n) ? n : NaN;
  };

  const start = toInt(obj.startHour);
  const end = toInt(obj.endHour);
  const interval = toInt(obj.intervalMinutes);
  const afternoon = toInt(obj.afternoonStartHour);

  if ([start, end, interval, afternoon].some((v) => Number.isNaN(v))) {
    return { ...DEFAULT_SCHEDULE_CONFIG };
  }

  const startHour = Math.min(23, Math.max(0, start));
  const endHour = Math.min(23, Math.max(0, end));
  const intervalMinutes = Math.min(240, Math.max(1, interval));
  const afternoonStartHour = Math.min(23, Math.max(0, afternoon));

  if (startHour >= endHour) {
    return { ...DEFAULT_SCHEDULE_CONFIG };
  }

  return { startHour, endHour, intervalMinutes, afternoonStartHour };
}

/** Format minutes-since-midnight as a `H:MM AM/PM` slot label (e.g. "8:00 AM"). */
function formatMinutesTo12h(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const min = minutes % 60;
  const modifier = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min.toString().padStart(2, "0")} ${modifier}`;
}

/**
 * Generate the full list of slot labels for a config. Walks minutes from
 * `startHour:00` to `endHour:00` (inclusive) in `intervalMinutes` steps.
 */
export function generateTimeSlots(config: BookingScheduleConfig): string[] {
  const startMinutes = config.startHour * 60;
  const endMinutes = config.endHour * 60;
  const step = Math.max(1, Math.round(config.intervalMinutes));

  const slots: string[] = [];
  for (let m = startMinutes; m <= endMinutes; m += step) {
    slots.push(formatMinutesTo12h(m));
  }
  return slots;
}

/**
 * Split slots into Morning / Afternoon groups based on `afternoonStartHour`.
 * The split is purely a UI convenience — the server and DB validate against the
 * full slot range, never the group boundaries.
 */
export function splitSlotsByPeriod(
  slots: string[],
  config: BookingScheduleConfig
): { morning: string[]; afternoon: string[] } {
  const threshold = config.afternoonStartHour * 60;
  const morning: string[] = [];
  const afternoon: string[] = [];

  for (const slot of slots) {
    if (getMinutesFromSlot(slot) < threshold) {
      morning.push(slot);
    } else {
      afternoon.push(slot);
    }
  }

  return { morning, afternoon };
}

/**
 * Combine a `YYYY-MM-DD` date and `HH:MM AM/PM` time into an absolute ISO
 * timestamp, interpreted in Asia/Kolkata (UTC+05:30). Matches the server-side
 * parse_slot_timestamp RPC exactly.
 */
export function combineDateTimeToISO(date: string, time: string): string {
  const [timePart, modifier] = time.split(" ");
  const [rawH, min] = timePart.split(":").map(Number);
  let h = rawH;
  if (modifier === "PM" && h !== 12) h += 12;
  if (modifier === "AM" && h === 12) h = 0;
  return new Date(
    `${date}T${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00${IST_OFFSET}`
  ).toISOString();
}

/** Parse a slot label like "7:30 AM" into minutes since midnight. */
export function getMinutesFromSlot(slot: string): number {
  const [timeVal, modifier] = slot.split(" ");
  const [h, m] = timeVal.split(":");
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

/**
 * Authoritative server-side slot check. Mirrors parse_slot_timestamp: a label
 * is valid only when it formats as `H:MM AM/PM`, falls inside the inclusive
 * [startHour, endHour] window, and aligns with the configured interval.
 */
export function isValidBookingSlot(time: string, config: BookingScheduleConfig): boolean {
  const clean = time.trim();
  if (!/^\d{1,2}:\d{2}\s*(AM|PM)$/.test(clean)) return false;

  const timeVal = clean.split(" ")[0];
  const hour = parseInt(timeVal.split(":")[0], 10);
  const minute = parseInt(timeVal.split(":")[1], 10);
  if (hour > 23 || minute > 59) return false;

  const minutes = getMinutesFromSlot(clean);
  if (Number.isNaN(minutes)) return false;

  const startMinutes = config.startHour * 60;
  const endMinutes = config.endHour * 60;
  const step = Math.max(1, Math.round(config.intervalMinutes));

  return (
    minutes >= startMinutes &&
    minutes <= endMinutes &&
    (minutes - startMinutes) % step === 0
  );
}

/**
 * Filter slots for a given selection date. On the selected date itself, only
 * retain slots at or after the reference "now" (client local time), matching
 * the checkout schedule behaviour. For any other day all slots remain.
 */
export function filterTimeSlots(
  slots: string[],
  selectedDate: Date,
  now: Date = new Date()
): string[] {
  const isToday =
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate();

  if (!isToday) return slots;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => getMinutesFromSlot(slot) >= nowMinutes);
}