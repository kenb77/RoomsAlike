"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminListingReviewActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "reject" ? { action, rejectionReason: reason || null } : { action }
      ),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <textarea
          rows={2}
          placeholder="Optional reason for the host"
          className="border rounded-lg px-2 py-1 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => act("reject")}
            disabled={loading}
            className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Confirm reject"}
          </button>
          <button
            onClick={() => setRejecting(false)}
            className="text-sm px-3 py-1 rounded-lg border hover:shadow"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act("approve")}
        disabled={loading}
        className="text-sm px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "..." : "Approve"}
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={loading}
        className="text-sm px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
      >
        Reject
      </button>
    </div>
  );
}
