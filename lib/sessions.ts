import { useSyncExternalStore } from 'react';
import type { SFSymbol } from 'expo-symbols';

import type { GeoPoint } from '@/lib/run';

export type Kind = 'lift' | 'run' | 'swim' | 'ride' | 'cardio' | 'voice';

/** Bucket a session falls in. Lookback ranges include the nearer buckets. */
export type Window = 'week' | 'prevMonth' | 'quarter' | 'year';

export type Exercise = {
  name: string;
  sets: { reps: number; kg: number }[];
};

export type Session = {
  id: string;
  name: string;
  detail: string;
  time: string;
  minutes: number;
  km?: number;
  symbol: SFSymbol;
  kind: Kind;
  window: Window;
  route?: GeoPoint[];
  /** Seconds per kilometre. */
  splits?: number[];
  exercises?: Exercise[];
};

export function formatMinutes(total: number) {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatSplit(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function sessionPace(session: Session) {
  if (!session.km || session.minutes <= 0) return '—';
  return formatSplit((session.minutes * 60) / session.km);
}

export function sessionVolume(session: Session) {
  return (
    session.exercises?.reduce(
      (sum, exercise) => sum + exercise.sets.reduce((sets, set) => sets + set.reps * set.kg, 0),
      0,
    ) ?? 0
  );
}

export function sessionSets(session: Session) {
  return session.exercises?.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
}

export function mix(sessions: Session[]) {
  const byKind = new Map<Kind, number>();
  for (const session of sessions) {
    byKind.set(session.kind, (byKind.get(session.kind) ?? 0) + session.minutes);
  }
  return [...byKind.entries()].filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
}

export function formatSessionKm(km: number) {
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function distanceOf(sessions: Session[]) {
  const moving = sessions.filter((session) => (session.km ?? 0) > 0);
  const km = moving.reduce((sum, session) => sum + (session.km ?? 0), 0);
  const runs = moving.filter((session) => session.kind === 'run').length;
  const rides = moving.filter((session) => session.kind === 'ride').length;
  const bits = [
    runs ? `${runs} ${runs === 1 ? 'run' : 'runs'}` : '',
    rides ? `${rides} ${rides === 1 ? 'ride' : 'rides'}` : '',
  ].filter(Boolean);
  return { km, note: bits.join(' · ') };
}

/** ponytail: a closed loop around one point, not a recorded GPS trace. */
function loop(km: number, wobble: number): GeoPoint[] {
  const lat = 37.7599;
  const lng = -122.4148;
  const radiusKm = km / (2 * Math.PI);
  const latScale = radiusKm / 110.574;
  const lngScale = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const pts: GeoPoint[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + 0.18 * Math.sin(a * wobble);
    pts.push({
      lat: lat + Math.sin(a) * latScale * w,
      lng: lng + Math.cos(a) * lngScale * (2 - w),
      t: i,
    });
  }
  return pts;
}

const SEED: Session[] = [
  {
    id: '1',
    name: 'Upper',
    detail: 'Today · 6 exercises · 18 sets',
    time: '52m',
    minutes: 52,
    symbol: 'figure.strengthtraining.traditional',
    kind: 'lift',
    window: 'week',
    exercises: [
      {
        name: 'Bench press',
        sets: [
          { reps: 8, kg: 60 },
          { reps: 8, kg: 60 },
          { reps: 6, kg: 65 },
        ],
      },
      {
        name: 'Bent-over row',
        sets: [
          { reps: 10, kg: 50 },
          { reps: 10, kg: 50 },
          { reps: 8, kg: 52 },
        ],
      },
      {
        name: 'Overhead press',
        sets: [
          { reps: 8, kg: 32 },
          { reps: 8, kg: 32 },
          { reps: 6, kg: 34 },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Run',
    detail: 'Mon · 4.2 km · 5:52/km',
    time: '28m',
    minutes: 28,
    km: 4.2,
    symbol: 'figure.run',
    kind: 'run',
    window: 'week',
    route: loop(4.2, 2),
    splits: [360, 348, 352, 355],
  },
  {
    id: '3',
    name: 'Swim',
    detail: 'Aug 28 · 40 lengths',
    time: '36m',
    minutes: 36,
    symbol: 'figure.pool.swim',
    kind: 'swim',
    window: 'prevMonth',
  },
  {
    id: '4',
    name: 'Lower',
    detail: 'Aug 12 · 5 exercises · 14 sets',
    time: '40m',
    minutes: 40,
    symbol: 'figure.strengthtraining.traditional',
    kind: 'lift',
    window: 'prevMonth',
    exercises: [
      {
        name: 'Back squat',
        sets: [
          { reps: 5, kg: 80 },
          { reps: 5, kg: 80 },
          { reps: 5, kg: 85 },
        ],
      },
      {
        name: 'Romanian deadlift',
        sets: [
          { reps: 8, kg: 70 },
          { reps: 8, kg: 70 },
        ],
      },
    ],
  },
  {
    id: '5',
    name: 'Run',
    detail: 'Aug 3 · 6.1 km · 6:10/km',
    time: '1h 2m',
    minutes: 62,
    km: 6.1,
    symbol: 'figure.run',
    kind: 'run',
    window: 'prevMonth',
    route: loop(6.1, 3),
    splits: [380, 365, 370, 375, 368, 360],
  },
  {
    id: '6',
    name: 'Legs',
    detail: 'Jul 18 · 4 exercises · 12 sets',
    time: '44m',
    minutes: 44,
    symbol: 'figure.strengthtraining.traditional',
    kind: 'lift',
    window: 'quarter',
    exercises: [
      {
        name: 'Front squat',
        sets: [
          { reps: 6, kg: 60 },
          { reps: 6, kg: 60 },
          { reps: 6, kg: 62 },
        ],
      },
      {
        name: 'Walking lunge',
        sets: [
          { reps: 10, kg: 16 },
          { reps: 10, kg: 16 },
        ],
      },
    ],
  },
  {
    id: '7',
    name: 'Ride',
    detail: 'Jun 30 · 18 km',
    time: '46m',
    minutes: 46,
    km: 18,
    symbol: 'figure.outdoor.cycle',
    kind: 'ride',
    window: 'quarter',
    route: loop(18, 4),
  },
  {
    id: '8',
    name: 'Hyrox',
    detail: 'Mar 2 · 8 stations',
    time: '1h 4m',
    minutes: 64,
    symbol: 'figure.mixed.cardio',
    kind: 'cardio',
    window: 'year',
  },
  {
    id: '9',
    name: 'Long run',
    detail: 'Jan 14 · 12.4 km',
    time: '1h 18m',
    minutes: 78,
    km: 12.4,
    symbol: 'figure.run',
    kind: 'run',
    window: 'year',
    route: loop(12.4, 5),
    splits: [390, 378, 372, 368, 375, 382, 370, 365, 360, 358, 364, 376],
  },
];

let current: Session[] = SEED;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getSessions() {
  return current;
}

export function getSession(id: string) {
  return current.find((session) => session.id === id) ?? null;
}

export function addSession(session: Session) {
  current = [session, ...current];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessions() {
  return useSyncExternalStore(subscribe, getSessions, getSessions);
}
