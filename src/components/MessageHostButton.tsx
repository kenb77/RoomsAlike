"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageHostButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    setLoading(false);
    if (!res.ok) return;
    const conversation = await res.json();
    router.push(`/messages/${conversation.id}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border px-4 py-2 text-sm font-medium hover:shadow disabled:opacity-50"
    >
      {loading ? "Starting..." : "Message host"}
    </button>
  );
}
