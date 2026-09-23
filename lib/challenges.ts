import { useSyncExternalStore } from 'react';

export type Metric = 'km' | 'sessions' | 'streak';

export type Participant = {
  handle: string;
  value: number;
  you?: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  metric: Metric;
  goal: number;
  endsInDays: number;
  participants: Participant[];
  joined: boolean;
};

export function standings(challenge: Challenge) {
  return [...challenge.participants].sort(
    (a, b) => b.value - a.value || a.handle.localeCompare(b.handle),
  );
}

/** 0–1. A non-positive goal stays empty. */
export function clampedProgress(value: number, goal: number) {
  if (!(goal > 0)) return 0;
  return Math.min(1, Math.max(0, value / goal));
}

export function formatMetric(metric: Metric, value: number) {
  if (metric === 'km') {
    const rounded = Math.round(value * 10) / 10;
    const shown = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${shown} km`;
  }
  if (metric === 'sessions') {
    const n = Math.round(value);
    return `${n} ${n === 1 ? 'session' : 'sessions'}`;
  }
  const days = Math.round(value);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

const SEED: Challenge[] = [
  {
    id: 'c1',
    title: 'September distance',
    metric: 'km',
    goal: 50,
    endsInDays: 4,
    joined: true,
    participants: [
      { handle: 'avery', value: 23.4, you: true },
      { handle: 'nori', value: 41.2 },
      { handle: 'kai', value: 36 },
      { handle: 'june', value: 18.5 },
    ],
  },
  {
    id: 'c2',
    title: 'Four sessions',
    metric: 'sessions',
    goal: 4,
    endsInDays: 6,
    joined: true,
    participants: [
      { handle: 'avery', value: 2, you: true },
      { handle: 'sol', value: 3 },
      { handle: 'mina', value: 4 },
    ],
  },
  {
    id: 'c3',
    title: 'Streak week',
    metric: 'streak',
    goal: 7,
    endsInDays: 2,
    joined: false,
    participants: [
      { handle: 'kai', value: 5 },
      { handle: 'nori', value: 6 },
    ],
  },
];

let current: Challenge[] = SEED;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getChallenges() {
  return current;
}

export function getChallenge(id: string) {
  return current.find((challenge) => challenge.id === id) ?? null;
}

export function joinChallenge(id: string, handle: string) {
  current = current.map((challenge) => {
    if (challenge.id !== id) return challenge;
    const hasYou = challenge.participants.some((person) => person.you || person.handle === handle);
    const participants = hasYou
      ? challenge.participants.map((person) =>
          person.you || person.handle === handle ? { ...person, you: true, handle } : person,
        )
      : [...challenge.participants, { handle, value: 0, you: true }];
    return { ...challenge, joined: true, participants };
  });
  emit();
}

export function leaveChallenge(id: string, handle: string) {
  current = current.map((challenge) => {
    if (challenge.id !== id) return challenge;
    return {
      ...challenge,
      joined: false,
      participants: challenge.participants.filter((person) => !person.you && person.handle !== handle),
    };
  });
  emit();
}

export function createChallenge(input: {
  title: string;
  metric: Metric;
  goal: number;
  endsInDays: number;
  handle: string;
  invite: string[];
}) {
  const invited = input.invite.filter((handle) => handle !== input.handle);
  const next: Challenge = {
    id: `c-${Date.now().toString(36)}`,
    title: input.title,
    metric: input.metric,
    goal: input.goal,
    endsInDays: input.endsInDays,
    joined: true,
    participants: [
      { handle: input.handle, value: 0, you: true },
      ...invited.map((handle) => ({ handle, value: 0 })),
    ],
  };
  current = [...current, next];
  emit();
  return next.id;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChallenges() {
  return useSyncExternalStore(subscribe, getChallenges, getChallenges);
}
