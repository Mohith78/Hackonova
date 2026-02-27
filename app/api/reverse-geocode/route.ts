import { NextResponse } from "next/server";
import { formatCoordinates, formatReadableLocation } from "@/lib/location";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");

  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid lat/lng query params." }, { status: 400 });
  }

  const fallback = formatCoordinates(lat, lng);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "Accept-Language": "en",
          // Nominatim usage policy expects identifiable callers.
          "User-Agent": "SpotAndSolve/1.0 (reverse geocoding via Next.js API route)",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ readable: fallback }, { status: 200 });
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };

    return NextResponse.json(
      {
        readable: formatReadableLocation(data, fallback),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ readable: fallback }, { status: 200 });
  }
}
