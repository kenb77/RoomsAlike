"use client";

import { useState } from "react";

type QuickReply = { id: string; title: string; body: string };

const SAMPLE_TEMPLATES = [
  { title: "Door code", body: "Door code: ____" },
  { title: "WiFi password", body: "WiFi network: ____ / Password: ____" },
  { title: "Where to put towels", body: "Please leave used towels in the hamper by the bathroom door." },
];

export default function QuickReplyManager({
  listingId,
  initialQuickReplies,
}: {
  listingId: string;
  initialQuickReplies: QuickReply[];
}) {
  const [quickReplies, setQuickReplies] = useState(initialQuickReplies);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addQuickReply(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/listings/${listingId}/quick-replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Could not save that quick reply");
      return;
    }

    const created = await res.json();
    setQuickReplies((prev) => [...prev, created]);
    setTitle("");
    setBody("");
  }

  async function removeQuickReply(id: string) {
    setQuickReplies((prev) => prev.filter((q) => q.id !== id));
    await fetch(`/api/quick-replies/${id}`, { method: "DELETE" });
  }

  function applySample(sample: { title: string; body: string }) {
    setTitle(sample.title);
    setBody(sample.body);
  }

  return (
    <div className="space-y-3">
      {quickReplies.length > 0 && (
        <div className="space-y-2">
          {quickReplies.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-2 border rounded-lg p-2">
              <div>
                <p className="text-xs font-medium">{q.title}</p>
                <p className="text-xs text-gray-500">{q.body}</p>
              </div>
              <button
                type="button"
                onClick={() => removeQuickReply(q.id)}
                className="text-xs text-gray-400 hover:text-red-600 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_TEMPLATES.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => applySample(s)}
            className="text-xs rounded-full border px-2.5 py-1 hover:bg-gray-50"
          >
            + {s.title}
          </button>
        ))}
      </div>

      <form onSubmit={addQuickReply} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Door code)"
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message text to send"
          rows={2}
          className="w-full border rounded-lg px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="text-xs rounded-lg border px-3 py-1.5 hover:shadow disabled:opacity-50"
        >
          {saving ? "Saving..." : "+ Add quick reply"}
        </button>
      </form>
    </div>
  );
}
