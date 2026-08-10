export const IST_OFFSET = "+05:30";

export const AVAILABLE_MORNING_SLOTS = [
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
];

export const AVAILABLE_AFTERNOON_SLOTS = [
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

export const ALL_AVAILABLE_SLOTS = [...AVAILABLE_MORNING_SLOTS, ...AVAILABLE_AFTERNOON_SLOTS];

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