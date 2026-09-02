"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditBookingForm from "@/components/EditBookingForm";

export function EditRequestButton({
  bookingId,
  startTime,
  endTime,
}: {
  bookingId: string;
  startTime: string;
  endTime: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div onClick={(e) => e.preventDefault()}>
        <button
          onClick={() => setOpen(true)}
          className="text-xs rounded-full border px-3 py-1.5 hover:shadow"
        >
          Edit request
        </button>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.preventDefault()} className="mt-2 w-full max-w-sm">
      <EditBookingForm
        bookingId={bookingId}
        startTime={startTime}
        endTime={endTime}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}

export function LeaveReviewButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/bookings/${bookingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit review");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div onClick={(e) => e.preventDefault()}>
        <button
          onClick={() => setOpen(true)}
          className="text-xs rounded-full border px-3 py-1.5 hover:shadow"
        >
          Leave a review
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.preventDefault()}
      className="mt-2 border rounded-lg p-3 bg-gray-50 w-full max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              className={`text-lg ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          required
          rows={2}
          placeholder="How did the booking go?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="text-xs rounded-full bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit review"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs rounded-full border px-3 py-1.5 hover:shadow"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
