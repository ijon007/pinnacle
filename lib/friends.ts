import { useSyncExternalStore } from 'react';

import { PEERS } from '@/lib/leaderboard';

export type FriendStatus = 'friend' | 'incoming' | 'outgoing' | 'none';
export type FriendAction = 'request' | 'accept' | 'remove' | 'cancel';

export type Friend = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  status: FriendStatus;
  recent: string[];
  streak: number;
};

const EXTRA: Record<string, Pick<Friend, 'bio' | 'status' | 'recent' | 'streak'>> = {
  nori: {
    bio: 'Early miles, late coffee.',
    status: 'friend',
    recent: ['9', '7'],
    streak: 6,
  },
  kai: {
    bio: 'Chasing a sub-20 5k.',
    status: 'friend',
    recent: ['5'],
    streak: 4,
  },
  june: {
    bio: 'Pool before work.',
    status: 'friend',
    recent: ['3'],
    streak: 3,
  },
  sol: {
    bio: 'Lifts and long walks.',
    status: 'friend',
    recent: ['4'],
    streak: 2,
  },
  rio: {
    bio: 'New to the long run.',
    status: 'incoming',
    recent: ['2'],
    streak: 1,
  },
  mina: {
    bio: 'Hyrox on Sundays.',
    status: 'incoming',
    recent: ['8'],
    streak: 5,
  },
  west: {
    bio: 'Rides the bridge loop.',
    status: 'outgoing',
    recent: ['7'],
    streak: 2,
  },
  lark: {
    bio: 'Short sessions, often.',
    status: 'none',
    recent: ['6'],
    streak: 1,
  },
};

export function applyFriendAction(status: FriendStatus, action: FriendAction): FriendStatus {
  switch (action) {
    case 'request':
      return status === 'none' ? 'outgoing' : status;
    case 'accept':
      return status === 'incoming' ? 'friend' : status;
    case 'cancel':
      return status === 'outgoing' || status === 'incoming' ? 'none' : status;
    case 'remove':
      return status === 'friend' ? 'none' : status;
    default: {
      const neverAction: never = action;
      return neverAction;
    }
  }
}

const SEED: Friend[] = PEERS.map((person) => {
  const extra = EXTRA[person.id];
  return {
    id: person.id,
    handle: person.handle,
    name: person.name,
    bio: extra?.bio ?? '',
    status: extra?.status ?? 'none',
    recent: extra?.recent ?? [],
    streak: extra?.streak ?? 0,
  };
});

let current: Friend[] = SEED;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getFriends() {
  return current;
}

function act(id: string, action: FriendAction) {
  current = current.map((person) =>
    person.id === id ? { ...person, status: applyFriendAction(person.status, action) } : person,
  );
  emit();
}

export function requestFriend(id: string) {
  act(id, 'request');
}

export function acceptFriend(id: string) {
  act(id, 'accept');
}

export function removeFriend(id: string) {
  act(id, 'remove');
}

export function cancelFriend(id: string) {
  act(id, 'cancel');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFriends() {
  return useSyncExternalStore(subscribe, getFriends, getFriends);
}
