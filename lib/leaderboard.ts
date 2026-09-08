export type BoardPerson = {
  id: string;
  handle: string;
  name: string;
  workouts: number;
  you?: boolean;
};

export type RankedPerson = BoardPerson & { rank: number };

/** All-time workout count. Logs tab is this week; this is the board metric. */
export const YOU: BoardPerson = {
  id: 'you',
  handle: 'avery',
  name: 'Avery Vale',
  workouts: 18,
  you: true,
};

const PEERS: BoardPerson[] = [
  { id: 'nori', handle: 'nori', name: 'Nori Hale', workouts: 42 },
  { id: 'kai', handle: 'kai', name: 'Kai Mendes', workouts: 37 },
  { id: 'june', handle: 'june', name: 'June Park', workouts: 29 },
  { id: 'sol', handle: 'sol', name: 'Sol Rivera', workouts: 21 },
  { id: 'rio', handle: 'rio', name: 'Rio Chen', workouts: 14 },
  { id: 'mina', handle: 'mina', name: 'Mina Cole', workouts: 11 },
  { id: 'west', handle: 'west', name: 'West Adler', workouts: 9 },
  { id: 'lark', handle: 'lark', name: 'Lark Quinn', workouts: 6 },
];

export function rankBoard(people: BoardPerson[]): RankedPerson[] {
  return [...people]
    .sort((a, b) => b.workouts - a.workouts || a.handle.localeCompare(b.handle))
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

export function board(): RankedPerson[] {
  return rankBoard([YOU, ...PEERS]);
}

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (a + b).toUpperCase();
}
