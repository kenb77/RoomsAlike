"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDeletionRequestActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "approve" | "deny") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/deletion-requests/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "deny" ? { action, denialReason: reason || null } : { action }
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

  if (denying) {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <textarea
          rows={2}
          placeholder="Optional reason for the user"
          className="border rounded-lg px-2 py-1 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => act("deny")}
            disabled={loading}
            className="text-sm px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Denying..." : "Confirm deny & reactivate"}
          </button>
          <button
            onClick={() => setDenying(false)}
            className="text-sm px-3 py-1 rounded-lg border hover:shadow"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={loading}
          className="text-sm px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "..." : "Approve (anonymize)"}
        </button>
        <button
          onClick={() => setDenying(true)}
          disabled={loading}
          className="text-sm px-3 py-1 rounded-lg border hover:shadow"
        >
          Deny
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
