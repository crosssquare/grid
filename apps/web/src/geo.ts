// Street-level reverse geocode via Nominatim. Only ever used for the viewer's OWN
// location label (top bar) — other users' locations are shown as distance only.
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const street = [a.road, a.house_number].filter(Boolean).join(" ") || null;
    const city = a.city ?? a.town ?? a.village ?? a.county ?? null;
    const place = [street, city].filter(Boolean).join(", ");
    return place || null;
  } catch {
    return null;
  }
}
