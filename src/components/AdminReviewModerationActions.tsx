"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminReviewModerationActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "deny") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/reviews/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={loading}
          className="text-sm px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "..." : "Approve"}
        </button>
        <button
          onClick={() => act("deny")}
          disabled={loading}
          className="text-sm px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
        >
          Deny
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
