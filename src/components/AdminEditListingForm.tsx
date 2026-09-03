"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AMENITY_OPTIONS } from "@/lib/amenities";
import PhotoUploadField from "@/components/PhotoUploadField";

type Props = {
  listingId: string;
  initial: {
    title: string;
    description: string;
    address: string;
    city: string;
    state: string | null;
    pricePerHour: number;
    pricePerDay: number | null;
    maxGuests: number;
    discountThresholdHours: number | null;
    discountPercent: number | null;
    cancellationPolicy: string | null;
    refundPolicy: string | null;
    photos: string[];
    amenities: string[];
  };
};

// Admin-only version of the listing form. Same fields as what a host fills
// in when creating a listing, but pre-filled and saved via the admin PATCH
// endpoint so staff can fix up content (typos, bad photos, etc.) directly.
export default function AdminEditListingForm({ listingId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description,
    address: initial.address,
    city: initial.city,
    state: initial.state ?? "",
    pricePerHour: String(initial.pricePerHour),
    pricePerDay: initial.pricePerDay?.toString() ?? "",
    maxGuests: String(initial.maxGuests),
    discountThresholdHours: initial.discountThresholdHours?.toString() ?? "",
    discountPercent: initial.discountPercent?.toString() ?? "",
    cancellationPolicy: initial.cancellationPolicy ?? "",
    refundPolicy: initial.refundPolicy ?? "",
  });
  const [photos, setPhotos] = useState<string[]>(
    initial.photos.length ? initial.photos : [""]
  );
  const [amenities, setAmenities] = useState<string[]>(initial.amenities);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));
    setSaved(false);
  }

  function updatePhoto(index: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? value : p)));
    setSaved(false);
  }

  function addPhotoField() {
    setPhotos((prev) => (prev.length < 4 ? [...prev, ""] : prev));
  }

  function removePhotoField(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        address: form.address,
        city: form.city,
        state: form.state.trim() || null,
        pricePerHour: Number(form.pricePerHour),
        pricePerDay: form.pricePerDay ? Number(form.pricePerDay) : null,
        maxGuests: Number(form.maxGuests),
        discountThresholdHours: form.discountThresholdHours
          ? Number(form.discountThresholdHours)
          : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
        photos: photos.map((p) => p.trim()).filter(Boolean),
        amenities,
        cancellationPolicy: form.cancellationPolicy.trim() || null,
        refundPolicy: form.refundPolicy.trim() || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Could not save changes");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-xl p-6">
      <div>
        <label className="block text-sm mb-1">Title</label>
        <input
          required
          className="w-full border rounded-lg px-3 py-2"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Description</label>
        <textarea
          required
          rows={4}
          className="w-full border rounded-lg px-3 py-2"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">City</label>
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">State</label>
          <input
            placeholder="e.g. TX"
            className="w-full border rounded-lg px-3 py-2"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Price / hour ($)</label>
          <input
            type="number"
            min={1}
            required
            className="w-full border rounded-lg px-3 py-2"
            value={form.pricePerHour}
            onChange={(e) => update("pricePerHour", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Price / day (optional, $)</label>
          <input
            type="number"
            min={1}
            placeholder="Leave blank to only offer hourly"
            className="w-full border rounded-lg px-3 py-2"
            value={form.pricePerDay}
            onChange={(e) => update("pricePerDay", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Max people</label>
        <input
          type="number"
          min={1}
          required
          className="w-full border rounded-lg px-3 py-2"
          value={form.maxGuests}
          onChange={(e) => update("maxGuests", e.target.value)}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Multi-hour discount</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Applies at (hours)</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-3 py-2"
              value={form.discountThresholdHours}
              onChange={(e) => update("discountThresholdHours", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Discount (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border rounded-lg px-3 py-2"
              value={form.discountPercent}
              onChange={(e) => update("discountPercent", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Amenities</p>
        <div className="grid grid-cols-2 gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={amenities.includes(a.key)}
                onChange={() => toggleAmenity(a.key)}
              />
              {a.label}
            </label>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-1">Cancellation policy</p>
        <textarea
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={form.cancellationPolicy}
          onChange={(e) => update("cancellationPolicy", e.target.value)}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-1">Refund policy</p>
        <textarea
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={form.refundPolicy}
          onChange={(e) => update("refundPolicy", e.target.value)}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Photos (up to 4)</p>
        <div className="space-y-3">
          {photos.map((url, i) => (
            <PhotoUploadField
              key={i}
              value={url}
              onChange={(v) => updatePhoto(i, v)}
              onRemove={photos.length > 1 ? () => removePhotoField(i) : undefined}
            />
          ))}
        </div>
        {photos.length < 4 && (
          <button
            type="button"
            onClick={addPhotoField}
            className="mt-2 text-sm text-rose-600 hover:underline"
          >
            + Add another photo
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-rose-600 text-white rounded-lg py-2.5 font-medium hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
