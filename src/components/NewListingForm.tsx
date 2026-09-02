"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AMENITY_OPTIONS } from "@/lib/amenities";
import PhotoUploadField from "@/components/PhotoUploadField";

export default function NewListingForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    pricePerHour: "",
    maxGuests: "2",
    discountThresholdHours: "",
    discountPercent: "",
    cancellationPolicy: "",
    refundPolicy: "",
  });
  const [photos, setPhotos] = useState<string[]>([""]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));
  }

  function updatePhoto(index: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? value : p)));
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

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        address: form.address,
        city: form.city,
        pricePerHour: Number(form.pricePerHour),
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
      setError(data.error?.formErrors?.[0] ?? data.error ?? "Could not create listing");
      return;
    }

    const listing = await res.json();
    router.push(`/host/listings/${listing.id}/pay`);
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
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-1">Multi-hour discount (optional)</p>
        <p className="text-xs text-gray-500 mb-2">
          Offer a discount once a booking reaches a certain number of hours — e.g. 10% off for
          bookings of 6+ hours.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Applies at (hours)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 6"
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
              placeholder="e.g. 10"
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
        <p className="text-sm font-medium mb-1">Cancellation policy (optional)</p>
        <textarea
          rows={3}
          placeholder="e.g. Free cancellation up to 24 hours before the booking start time."
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={form.cancellationPolicy}
          onChange={(e) => update("cancellationPolicy", e.target.value)}
        />
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-1">Refund policy (optional)</p>
        <textarea
          rows={3}
          placeholder="e.g. Deposits are non-refundable within 48 hours of the booking."
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
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-rose-600 text-white rounded-lg py-2.5 font-medium hover:bg-rose-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Continue to subscription"}
      </button>
    </form>
  );
}
