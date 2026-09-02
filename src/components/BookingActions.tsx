"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  status: "PENDING" | "APPROVED" | "CANCELLED";
  // Only the host can approve/decline a pending request. Both host and
  // renter can cancel an already-approved booking.
  canApprove?: boolean;
};

export default function BookingActions({ bookingId, status, canApprove = true }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(next: "APPROVED" | "CANCELLED") {
    setLoading(next);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(null);
    router.refresh();
  }

  if (status === "CANCELLED") return null;

  if (status === "PENDING" && canApprove) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => updateStatus("APPROVED")}
          disabled={!!loading}
          className="text-xs rounded-full bg-green-600 text-white px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "APPROVED" ? "..." : "Approve"}
        </button>
        <button
          onClick={() => updateStatus("CANCELLED")}
          disabled={!!loading}
          className="text-xs rounded-full border px-3 py-1.5 hover:shadow disabled:opacity-50"
        >
          {loading === "CANCELLED" ? "..." : "Decline"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => updateStatus("CANCELLED")}
      disabled={!!loading}
      className="text-xs rounded-full border px-3 py-1.5 hover:shadow disabled:opacity-50"
    >
      {loading === "CANCELLED" ? "..." : "Cancel booking"}
    </button>
  );
}
