import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

// Waypoint: [lng, lat]
export async function POST(req: NextRequest) {
  const { waypoints } = await req.json() as { waypoints: [number, number][] };

  if (!waypoints || waypoints.length < 2) {
    return NextResponse.json({ error: 'At least 2 waypoints required' }, { status: 400 });
  }

  const apiKey = process.env.ORS_API_KEY;

  // Primary: OpenRouteService (production-grade)
  if (apiKey) {
    try {
      const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({ coordinates: waypoints }),
      });
      if (res.ok) {
        const data = await res.json();
        const feature = data.features?.[0];
        if (feature) {
          return NextResponse.json({
            coordinates: feature.geometry.coordinates as [number, number][],
            distanceKm: (feature.properties.summary.distance / 1000),
            durationMin: Math.round(feature.properties.summary.duration / 60),
          });
        }
      }
    } catch { /* fallback to OSRM */ }
  }

  // Fallback: public OSRM demo (best-effort, no SLA)
  try {
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const data = await res.json();
      const route = data.routes?.[0];
      if (route) {
        return NextResponse.json({
          coordinates: route.geometry.coordinates as [number, number][],
          distanceKm: route.distance / 1000,
          durationMin: Math.round(route.duration / 60),
        });
      }
    }
  } catch { /* both failed */ }

  return NextResponse.json({ error: 'Routing unavailable' }, { status: 503 });
}
