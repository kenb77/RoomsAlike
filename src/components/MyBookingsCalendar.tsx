"use client";

import { useMemo, useState } from "react";

type Item = { id: string; startTime: string; endTime: string; status: "PENDING" | "APPROVED" | "CANCELLED" };

type Props = { bookings: Item[] };

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MyBookingsCalendar({ bookings }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date | null>(null);

  const parsed = useMemo(
    () => bookings.filter((b) => b.status !== "CANCELLED").map((b) => ({ ...b, start: new Date(b.startTime) })),
    [bookings]
  );

  function bookingsOnDate(day: Date) {
    return parsed.filter((b) => isSameDay(b.start, day));
  }

  function handleClick(day: Date) {
    setSelected(day);
    const matches = document.querySelectorAll(`[data-booking-date="${dateKey(day)}"]`);
    matches.forEach((el, i) => {
      el.classList.add("ring-2", "ring-rose-500");
      if (i === 0) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el.classList.remove("ring-2", "ring-rose-500"), 2000);
    });
  }

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="border rounded-xl p-4 bg-white mb-6 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonthCursor((m) => addMonths(m, -1))}
            className="text-sm px-2 py-1 rounded hover:bg-gray-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonthCursor((m) => addMonths(m, 1))}
            className="text-sm px-2 py-1 rounded hover:bg-gray-100"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayBookings = bookingsOnDate(day);
          const isSelected = selected && isSameDay(day, selected);
          const dotColor = dayBookings.some((b) => b.status === "APPROVED") ? "bg-blue-600" : "bg-amber-500";
          return (
            <button
              type="button"
              key={i}
              onClick={() => handleClick(day)}
              className={[
                "aspect-square text-xs rounded-full flex items-center justify-center relative",
                dayBookings.length > 0 ? "hover:bg-rose-50 cursor-pointer" : "text-gray-300 cursor-default",
                isSelected ? "bg-rose-600 text-white hover:bg-rose-600" : "",
              ].join(" ")}
            >
              {day.getDate()}
              {dayBookings.length > 0 && !isSelected && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor}`} />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Approved
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-2">Click a date to jump to that booking below.</p>
    </div>
  );
}
