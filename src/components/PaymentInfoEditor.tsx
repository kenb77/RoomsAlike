"use client";

import { useState } from "react";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/paymentMethods";

// Parses a previously-saved free-text value back into per-method handles,
// so re-opening this editor doesn't lose what was there before. Matches
// lines like "Venmo: @name" that this component itself produces.
function parseInitialValue(value: string): Record<string, string> {
  const handles: Record<string, string> = {};
  for (const line of value.split("\n")) {
    for (const opt of PAYMENT_METHOD_OPTIONS) {
      const prefix = `${opt.label}:`;
      if (line.trim().toLowerCase().startsWith(prefix.toLowerCase())) {
        handles[opt.key] = line.trim().slice(prefix.length).trim();
      }
    }
  }
  return handles;
}

export default function PaymentInfoEditor({ initialValue }: { initialValue: string }) {
  const [handles, setHandles] = useState<Record<string, string>>(() =>
    parseInitialValue(initialValue)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleMethod(key: string) {
    setHandles((prev) => {
      const next = { ...prev };
      if (key in next) {
        delete next[key];
      } else {
        next[key] = "";
      }
      return next;
    });
    setSaved(false);
  }

  function updateHandle(key: string, value: string) {
    setHandles((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);

    const composed = PAYMENT_METHOD_OPTIONS.filter((opt) => opt.key in handles)
      .map((opt) => `${opt.label}: ${handles[opt.key]?.trim() || "(no handle added)"}`)
      .join("\n");

    const res = await fetch("/api/host/payment-info", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentInfo: composed || null }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="border rounded-xl p-4 bg-white mb-6">
      <p className="text-sm font-medium mb-1">Payment methods</p>
      <p className="text-xs text-gray-500 mb-3">
        Pick what you accept and add your handle for each. Renters see this as a quick-reply
        message you can drop into any chat with one click. Never processed by the platform, just a
        canned message you send yourself.
      </p>
      <div className="space-y-2">
        {PAYMENT_METHOD_OPTIONS.map((opt) => {
          const checked = opt.key in handles;
          return (
            <div key={opt.key} className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm w-28 shrink-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMethod(opt.key)}
                />
                {opt.label}
              </label>
              {checked && (
                <input
                  placeholder={opt.placeholder}
                  value={handles[opt.key] ?? ""}
                  onChange={(e) => updateHandle(opt.key, e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                />
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 text-sm rounded-lg border px-3 py-1.5 hover:shadow disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
