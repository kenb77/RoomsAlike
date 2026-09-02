"use client";

import { useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
};

// One photo slot: a URL text field (still works if a host wants to paste an
// external image link) plus an "Upload" button that pushes a file straight
// to Cloudflare R2 via a presigned URL and fills the field in automatically.
export default function PhotoUploadField({ value, onChange, onRemove }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const presignRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not start upload");
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Upload failed — try again");

      onChange(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          placeholder="https://... link to a photo, or upload one"
          className="flex-1 border rounded-lg px-3 py-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm px-3 rounded-lg border hover:shadow disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelected}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm px-3 rounded-lg border hover:shadow"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-20 w-32 object-cover rounded-lg border" />
      )}
    </div>
  );
}
