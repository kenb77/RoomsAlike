"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditBookingForm({
  bookingId,
  startTime,
  endTime,
  onDone,
}: {
  bookingId: string;
  startTime: string;
  endTime: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [start, setStart] = useState(toLocalInputValue(startTime));
  const [end, setEnd] = useState(toLocalInputValue(endTime));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not update this booking");
      return;
    }
    router.refresh();
    onDone?.();
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">New start</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">New end</label>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="text-xs rounded-lg border px-3 py-1.5 hover:shadow"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-400">
        This updates the price estimate automatically and sends a note in the chat with the other
        party so they see the change.
      </p>
    </div>
  );
}
