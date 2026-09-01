"use client";

import { useState } from "react";

export default function VerifyButton({ canRetry }: { canRetry: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/identity/verify", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not start verification");
      setLoading(false);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-rose-600 text-white px-6 py-3 font-medium hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : canRetry ? "Try again" : "Start verification"}
      </button>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
