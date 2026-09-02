export const AMENITY_OPTIONS = [
  { key: "wifi", label: "WiFi" },
  { key: "parking", label: "Free parking" },
  { key: "kitchen", label: "Kitchen" },
  { key: "restroom", label: "Restroom" },
  { key: "air_conditioning", label: "Air conditioning" },
  { key: "heating", label: "Heating" },
  { key: "natural_light", label: "Natural light" },
  { key: "sound_system", label: "Sound system" },
  { key: "projector_tv", label: "Projector / TV" },
  { key: "furniture", label: "Tables & chairs" },
  { key: "outdoor_space", label: "Outdoor space" },
  { key: "elevator_access", label: "Elevator access" },
  { key: "wheelchair_accessible", label: "Wheelchair accessible" },
  { key: "loading_access", label: "Loading dock / freight access" },
] as const;

export const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  AMENITY_OPTIONS.map((o) => [o.key, o.label])
);
