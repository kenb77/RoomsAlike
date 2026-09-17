"use client";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

// Bookings (and check-in/check-out windows) are on-the-hour only, no minutes.
export function to24(hour12: number, ampm: "AM" | "PM") {
  let h = hour12 % 12;
  if (ampm === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:00`;
}

export function from24(value: string) {
  const h = parseInt(value.split(":")[0], 10) || 0;
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, ampm };
}

export function formatHour24(value: string) {
  const { hour12, ampm } = from24(value);
  return `${hour12}:00 ${ampm}`;
}

// Plain <select> dropdowns instead of a native <input type="time"> — the
// native time picker is unreliable to interact with on a lot of phones and
// browsers, dropdowns work the same everywhere. Hour + AM/PM only, no
// minutes.
export default function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { hour12, ampm } = from24(value);
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <select
          value={hour12}
          onChange={(e) => onChange(to24(Number(e.target.value), ampm))}
          className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm"
        >
          {HOURS_12.map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
        <select
          value={ampm}
          onChange={(e) => onChange(to24(hour12, e.target.value as "AM" | "PM"))}
          className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
