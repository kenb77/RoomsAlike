"use client";

import { useState } from "react";

export default function PaymentInfoEditor({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/host/payment-info", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentInfo: value.trim() || null }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="border rounded-xl p-4 bg-white mb-6">
      <p className="text-sm font-medium mb-1">Payment info quick message</p>
      <p className="text-xs text-gray-500 mb-2">
        Saved here once, insertable into any chat with one click — e.g. your Venmo/Zelle/PayPal
        handle. Never processed by the platform, just a canned message you send yourself.
      </p>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. Venmo: @yourname, or PayPal: you@email.com. Deposit due at booking, balance due at check-in."
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-2 text-sm rounded-lg border px-3 py-1.5 hover:shadow disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
