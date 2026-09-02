"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PayListingPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handlePay() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: params.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not start checkout");
      setLoading(false);
      return;
    }

    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Activate your listing</h1>
      <p className="text-gray-500 mb-8">
        A monthly subscription is required to keep your listing visible to renters. You can cancel anytime from your host dashboard.
      </p>

      {success && (
        <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">
          Payment received! It may take a few seconds for your listing to go live.
        </p>
      )}
      {canceled && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
          Checkout was canceled. You can try again below.
        </p>
      )}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-rose-600 text-white rounded-full px-6 py-3 font-medium hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Start monthly subscription"}
      </button>
    </div>
  );
}
