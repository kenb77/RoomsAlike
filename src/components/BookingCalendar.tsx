"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookingActions from "@/components/BookingActions";
import EditBookingForm from "@/components/EditBookingForm";

type BookedRange = { startTime: string; endTime: string };

type HostBooking = {
  id: string;
  renterName: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED" | "CANCELLED";
  totalPrice: number;
  depositNote: string | null;
};

type Props = {
  listingId: string;
  pricePerHour: number;
  discountThresholdHours: number | null;
  discountPercent: number | null;
  bookedRanges: BookedRange[];
  isOwnListing: boolean;
  isLoggedIn: boolean;
  isIdVerified: boolean;
  // Only passed in when the viewer is the host of this listing — full
  // booking details (renter name, price, deposit note) stay host-only.
  hostBookings?: HostBooking[];
  // Set to false when embedding this inline in a list (e.g. the host
  // dashboard) so it doesn't try to stick to the viewport while scrolling.
  sticky?: boolean;
};

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function priceForHours(
  hours: number,
  pricePerHour: number,
  discountThresholdHours: number | null,
  discountPercent: number | null
) {
  let total = hours * pricePerHour;
  if (discountThresholdHours != null && discountPercent != null && hours >= discountThresholdHours) {
    total *= 1 - discountPercent / 100;
  }
  return Math.round(total * 100) / 100;
}

function formatDateTime(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function BookingCalendar({
  listingId,
  pricePerHour,
  discountThresholdHours,
  discountPercent,
  bookedRanges,
  isOwnListing,
  isLoggedIn,
  isIdVerified,
  hostBookings,
  sticky = true,
}: Props) {
  const router = useRouter();
  const stickyClass = sticky ? " sticky top-20" : "";

  const today = useMemo(() => toDateOnly(new Date()), []);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // Renter flow: rangeStart/rangeEnd are both dates (day granularity). A
  // single click selects a one-day booking; clicking a later date extends
  // it into a multi-day range.
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Host flow: a single selected day to inspect.
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const booked = useMemo(
    () =>
      bookedRanges.map((r) => ({
        start: new Date(r.startTime),
        end: new Date(r.endTime),
      })),
    [bookedRanges]
  );

  function rangeOverlapsDay(start: Date, end: Date, day: Date) {
    return start < endOfDay(day) && end > startOfDay(day);
  }

  function bookingsOverlappingDay(day: Date) {
    return booked.filter((b) => rangeOverlapsDay(b.start, b.end, day));
  }

  function bookingsOverlappingRange(start: Date, end: Date) {
    return booked.filter((b) => b.start < end && b.end > start);
  }

  const parsedHostBookings = useMemo(
    () =>
      (hostBookings ?? [])
        .filter((b) => b.status !== "CANCELLED")
        .map((b) => ({ ...b, start: new Date(b.startTime), end: new Date(b.endTime) })),
    [hostBookings]
  );

  function hostBookingsOverlappingDay(day: Date) {
    return parsedHostBookings.filter((b) => rangeOverlapsDay(b.start, b.end, day));
  }

  function isPast(day: Date) {
    return day < today;
  }

  function handleDayClick(day: Date) {
    if (isPast(day)) return;

    if (isOwnListing) {
      setSelectedDate(day);
      return;
    }

    setError("");
    setSuccess(false);

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Starting a fresh selection.
      setRangeStart(day);
      setRangeEnd(day);
      return;
    }

    // rangeStart is set, rangeEnd matches it (still single-day) — extend or restart.
    if (day.getTime() >= rangeStart.getTime()) {
      setRangeEnd(day);
    } else {
      setRangeStart(day);
      setRangeEnd(day);
    }
  }

  function resetToSingleDay() {
    if (rangeStart) setRangeEnd(rangeStart);
  }

  const isMultiDay = !!(rangeStart && rangeEnd && !isSameDay(rangeStart, rangeEnd));

  const startDateTime = useMemo(() => {
    if (!rangeStart) return null;
    const [h, m] = startTime.split(":").map(Number);
    const d = new Date(rangeStart);
    d.setHours(h, m, 0, 0);
    return d;
  }, [rangeStart, startTime]);

  const endDateTime = useMemo(() => {
    const end = rangeEnd ?? rangeStart;
    if (!end) return null;
    const [h, m] = endTime.split(":").map(Number);
    const d = new Date(end);
    d.setHours(h, m, 0, 0);
    return d;
  }, [rangeStart, rangeEnd, endTime]);

  const hours =
    startDateTime && endDateTime && endDateTime > startDateTime
      ? (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
      : 0;

  const total = hours > 0 ? priceForHours(hours, pricePerHour, discountThresholdHours, discountPercent) : 0;
  const discountActive =
    discountThresholdHours != null && discountPercent != null && hours >= discountThresholdHours;

  function renderMonth(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div className="w-full">
        <p className="text-sm font-medium mb-2 text-center">
          {monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const disabled = isPast(day);

            const isSelected = isOwnListing
              ? selectedDate && isSameDay(day, selectedDate)
              : rangeStart && rangeEnd
              ? day.getTime() >= startOfDay(rangeStart).getTime() && day.getTime() <= startOfDay(rangeEnd).getTime()
              : rangeStart && isSameDay(day, rangeStart);
            const isRangeEdge = !isOwnListing && rangeStart && (isSameDay(day, rangeStart) || (rangeEnd && isSameDay(day, rangeEnd)));

            const dayBookings = bookingsOverlappingDay(day);
            const dayHostBookings = isOwnListing ? hostBookingsOverlappingDay(day) : [];
            const hasBooking = isOwnListing ? dayHostBookings.length > 0 : dayBookings.length > 0;
            const dotColor = isOwnListing
              ? dayHostBookings.some((b) => b.status === "APPROVED")
                ? "bg-green-500"
                : "bg-amber-500"
              : "bg-amber-500";

            return (
              <button
                type="button"
                key={i}
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                className={[
                  "aspect-square text-xs flex items-center justify-center relative",
                  isRangeEdge ? "rounded-full" : isSelected ? "rounded-none" : "rounded-full",
                  disabled ? "text-gray-300 line-through cursor-not-allowed" : "hover:bg-rose-50 cursor-pointer",
                  isSelected && !isRangeEdge ? "bg-rose-100 text-rose-900 hover:bg-rose-100" : "",
                  isRangeEdge ? "bg-rose-600 text-white hover:bg-rose-600" : "",
                ].join(" ")}
              >
                {day.getDate()}
                {!disabled && hasBooking && !isSelected && (
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  async function handleBook() {
    if (!startDateTime || !endDateTime || hours <= 0) {
      setError("Pick dates and a valid time range");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create booking request");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  if (isOwnListing) {
    const dateBookings = selectedDate ? hostBookingsOverlappingDay(selectedDate) : [];
    return (
      <div className={"border rounded-xl p-6 bg-white" + stickyClass}>
        <p className="text-sm text-gray-500 mb-4">
          This is your listing — booked dates and requests are shown below. Renters see these same
          dates as unavailable for those hours.
        </p>

        <div className="flex items-center justify-between mb-3">
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
        {renderMonth(monthCursor)}

        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending request
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Approved
          </span>
        </div>

        {selectedDate && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <p className="text-sm font-medium">
              {selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>

            {dateBookings.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing booked on this date.</p>
            ) : (
              dateBookings.map((b) => <HostBookingCard key={b.id} booking={b} />)
            )}
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="border rounded-xl p-6 bg-white text-center">
        <p className="text-sm text-gray-500 mb-3">Log in to request a booking.</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-rose-600 text-white px-5 py-2 text-sm font-medium hover:bg-rose-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (!isIdVerified) {
    return (
      <div className="border rounded-xl p-6 bg-white text-center">
        <p className="text-sm text-gray-500 mb-3">
          You need to verify your ID before requesting a booking.
        </p>
        <Link
          href="/verify"
          className="inline-block rounded-full bg-rose-600 text-white px-5 py-2 text-sm font-medium hover:bg-rose-700"
        >
          Verify your ID
        </Link>
      </div>
    );
  }

  const overlapping = rangeStart && rangeEnd ? bookingsOverlappingRange(startOfDay(rangeStart), endOfDay(rangeEnd)) : [];

  return (
    <div className="border rounded-xl p-6 bg-white sticky top-20">
      <p className="text-lg font-semibold mb-4">
        ${pricePerHour.toFixed(0)} <span className="font-normal text-gray-500 text-sm">/ hour</span>
      </p>

      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMonthCursor((m) => addMonths(m, -1))}
          className="text-sm px-2 py-1 rounded hover:bg-gray-100"
        >
          ‹
        </button>
        <p className="text-xs text-gray-400">Click a date, then click a later date to book multiple days</p>
        <button
          type="button"
          onClick={() => setMonthCursor((m) => addMonths(m, 1))}
          className="text-sm px-2 py-1 rounded hover:bg-gray-100"
        >
          ›
        </button>
      </div>
      {renderMonth(monthCursor)}

      {rangeStart && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {rangeStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {isMultiDay && rangeEnd && (
                <>
                  {" – "}
                  {rangeEnd.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </>
              )}
            </p>
            {isMultiDay && (
              <button type="button" onClick={resetToSingleDay} className="text-xs text-rose-600 hover:underline">
                Reset to single day
              </button>
            )}
          </div>

          {overlapping.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Already requested/booked in this range:{" "}
              {overlapping
                .map((b) => `${formatDateTime(b.start)} – ${formatDateTime(b.end)}`)
                .join(", ")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {isMultiDay ? "Check-in time" : "Start"}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {isMultiDay ? "Check-out time" : "End"}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          {hours > 0 && (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>
                  ${pricePerHour.toFixed(0)} × {hours} hour{hours !== 1 ? "s" : ""}
                  {discountActive && ` (${discountPercent}% off applied)`}
                </span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t">
                <span>Estimated total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400">
                No payment happens here — this is just a time request. You and the host arrange the
                deposit and payment directly once approved.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
              Request sent! Message the host to arrange payment once they approve.
            </p>
          )}

          <button
            onClick={handleBook}
            disabled={loading || hours <= 0}
            className="w-full bg-rose-600 text-white rounded-lg py-2.5 font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Requesting..." : "Request this time"}
          </button>
        </div>
      )}
    </div>
  );
}

const cardStatusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function HostBookingCard({
  booking,
}: {
  booking: HostBooking & { start: Date; end: Date };
}) {
  const [depositNote, setDepositNote] = useState(booking.depositNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  async function saveDeposit() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositNote: depositNote.trim() || null }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  const h = (booking.end.getTime() - booking.start.getTime()) / (1000 * 60 * 60);
  const spansDays = !isSameDay(booking.start, booking.end);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{booking.renterName}</p>
          <p className="text-xs text-gray-500">
            {spansDays ? formatDateTime(booking.start) : booking.start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {" – "}
            {spansDays ? formatDateTime(booking.end) : booking.end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {" · "}
            {h} hour{h !== 1 ? "s" : ""}
            {" · ~$"}
            {booking.totalPrice.toFixed(2)} est.
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cardStatusStyles[booking.status]}`}>
          {booking.status}
        </span>
      </div>

      {booking.status !== "CANCELLED" && <BookingActions bookingId={booking.id} status={booking.status} />}

      {booking.status !== "CANCELLED" &&
        (editing ? (
          <EditBookingForm
            bookingId={booking.id}
            startTime={booking.startTime}
            endTime={booking.endTime}
            onDone={() => setEditing(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-rose-600 hover:underline"
          >
            Edit date/time
          </button>
        ))}

      {booking.status !== "CANCELLED" && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Deposit note (private, for your own tracking only)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={depositNote}
              onChange={(e) => {
                setDepositNote(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. $50 deposit via Venmo, due at check-in"
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={saveDeposit}
              disabled={saving}
              className="text-xs rounded-lg border px-3 py-1.5 hover:shadow disabled:opacity-50 shrink-0"
            >
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
