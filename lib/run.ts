export type GeoPoint = {
  lat: number;
  lng: number;
  t: number;
};

const EARTH_M = 6_371_000;
const MIN_STEP_M = 1;
const MAX_ACC_M = 65;
/** ponytail: rejects car/teleport jumps; raise if we add a ride mode. */
const MAX_SPEED_MPS = 12.5;

export function metersBetween(a: GeoPoint, b: GeoPoint): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function foldFix(
  prev: GeoPoint | null,
  next: { lat: number; lng: number; t: number; acc?: number | null },
): { point: GeoPoint; add: number } | null {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return null;
  const acc = next.acc;
  const point: GeoPoint = { lat: next.lat, lng: next.lng, t: next.t };
  if (!prev) return { point, add: 0 };
  if (acc != null && acc > MAX_ACC_M) return null;
  if (next.t <= prev.t) return null;
  const d = metersBetween(prev, point);
  if (d < MIN_STEP_M) return null;
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0 || d / dt > MAX_SPEED_MPS) return null;
  return { point, add: d };
}

export function formatKm(meters: number): string {
  const km = Math.max(0, meters) / 1000;
  if (km < 10) return km.toFixed(2);
  return km.toFixed(1);
}

export function movingElapsed(
  now: number,
  startedAt: number,
  heldMs: number,
  heldFrom: number | null,
): number {
  const extra = heldFrom != null ? Math.max(0, now - heldFrom) : 0;
  return Math.max(0, now - startedAt - heldMs - extra);
}

export function formatPace(ms: number, meters: number): string {
  if (meters < 50) return '—';
  const secPerKm = ms / 1000 / (meters / 1000);
  if (!Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return '—';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
