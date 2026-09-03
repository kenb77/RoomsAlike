"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/account/delete-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }
    signOut({ callbackUrl: "/" });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 hover:underline"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
      <p className="text-sm text-gray-700">
        This immediately deactivates your account until an admin reviews the request.
        You won&apos;t be able to log in while it&apos;s pending. Your bookings, listings, and
        messages stay intact either way.
      </p>
      <textarea
        rows={2}
        placeholder="Optional: tell us why you're leaving"
        className="w-full border rounded-lg px-3 py-2 text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Confirm deletion request"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg border hover:shadow"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
