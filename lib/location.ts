type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatReadableLocation(
  payload: NominatimReverseResponse | null | undefined,
  fallback: string
): string {
  if (!payload) return fallback;

  const address = payload.address;
  if (!address) {
    return payload.display_name || fallback;
  }

  const street =
    [address.house_number, address.road]
      .filter(Boolean)
      .join(" ")
      .trim() || address.neighbourhood || address.suburb || "";

  const locality =
    address.suburb || address.city_district || address.city || address.town || address.village || address.county || "";

  const region = address.state || "";
  const postal = address.postcode || "";
  const country = address.country || "";

  const readable = [street, locality, region, postal, country]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");

  return readable || payload.display_name || fallback;
}

