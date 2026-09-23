import { clampedProgress, standings, type Challenge } from './challenges';

const sample: Challenge = {
  id: 't',
  title: 'Test',
  metric: 'km',
  goal: 10,
  endsInDays: 3,
  joined: true,
  participants: [
    { handle: 'b', value: 4 },
    { handle: 'a', value: 4 },
    { handle: 'c', value: 9 },
  ],
};

const ranked = standings(sample);
if (ranked[0]?.handle !== 'c' || ranked[1]?.handle !== 'a' || ranked[2]?.handle !== 'b') {
  throw new Error('standings should sort by value then handle');
}

if (clampedProgress(5, 10) !== 0.5) throw new Error('mid progress');
if (clampedProgress(20, 10) !== 1) throw new Error('progress clamps high');
if (clampedProgress(-2, 10) !== 0) throw new Error('progress clamps low');
if (clampedProgress(4, 0) !== 0) throw new Error('zero goal');

console.log('challenges.check ok');
