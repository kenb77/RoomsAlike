"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(status: "APPROVED" | "CANCELLED") {
    setLoading(status);
    await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

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
