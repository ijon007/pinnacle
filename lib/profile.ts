import { useSyncExternalStore } from 'react';

export type Profile = {
  name: string;
  username: string;
  bio: string;
  photoUri: string | null;
};

export const DEFAULT_PROFILE: Profile = {
  name: 'Avery Vale',
  username: 'avery',
  bio: 'Logs, lifts, and a long run.',
  photoUri: null,
};

const STORAGE_KEY = 'pinnacle.profile';
const NAME_MAX = 40;
const BIO_MAX = 160;
const USERNAME = /^[a-z0-9_]{2,20}$/;

export function normalizeUsername(raw: string) {
  return raw.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

/** Null when the draft can be saved. */
export function profileIssue(input: { name: string; username: string }) {
  if (!input.name.trim()) return 'Add a name.';
  if (!USERNAME.test(normalizeUsername(input.username))) {
    return 'Usernames are 2–20 letters, numbers, or underscores.';
  }
  return null;
}

function parseProfile(raw: string): Profile | null {
  try {
    const data = JSON.parse(raw) as Partial<Profile>;
    if (typeof data.name !== 'string' || typeof data.username !== 'string') return null;
    const name = data.name.trim().slice(0, NAME_MAX);
    const username = normalizeUsername(data.username);
    if (!name || !USERNAME.test(username)) return null;
    const bio = typeof data.bio === 'string' ? data.bio.trim().slice(0, BIO_MAX) : '';
    const photoUri = typeof data.photoUri === 'string' && data.photoUri.length > 0 ? data.photoUri : null;
    return { name, username, bio, photoUri };
  } catch {
    return null;
  }
}

let current: Profile = DEFAULT_PROFILE;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  const stored = readStored();
  if (stored) current = stored;
}

function readStored(): Profile | null {
  try {
    const { Platform } = require('react-native') as typeof import('react-native');
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? parseProfile(raw) : null;
    }
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const file = new File(Paths.document, 'profile.json');
    if (!file.exists) return null;
    return parseProfile(file.textSync());
  } catch {
    return null;
  }
}

function writeStored(profile: Profile) {
  const raw = JSON.stringify(profile);
  const { Platform } = require('react-native') as typeof import('react-native');
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, raw);
    return;
  }
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const file = new File(Paths.document, 'profile.json');
  if (!file.exists) file.create();
  file.write(raw);
}

function settlePhoto(uri: string | null): string | null {
  try {
    const { Platform } = require('react-native') as typeof import('react-native');
    if (Platform.OS === 'web') return uri;
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const dest = new File(Paths.document, 'profile-photo.jpg');
    if (!uri) {
      if (dest.exists) dest.delete();
      return null;
    }
    if (uri === dest.uri) return uri;
    new File(uri).copySync(dest, { overwrite: true });
    return dest.uri;
  } catch {
    return uri;
  }
}

export function getProfile() {
  ensureLoaded();
  return current;
}

export function saveProfile(next: Profile) {
  const saved: Profile = {
    name: next.name.trim().slice(0, NAME_MAX),
    username: normalizeUsername(next.username),
    bio: next.bio.trim().slice(0, BIO_MAX),
    photoUri: settlePhoto(next.photoUri),
  };
  if (profileIssue(saved)) return;
  current = saved;
  loaded = true;
  try {
    writeStored(saved);
  } catch {
    // The screen still shows the saved profile for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProfile() {
  return useSyncExternalStore(subscribe, getProfile, () => DEFAULT_PROFILE);
}
