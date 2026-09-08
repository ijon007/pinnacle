import { ordinal, rankBoard } from './leaderboard';

const ranked = rankBoard([
  { id: 'a', handle: 'a', name: 'A', workouts: 2 },
  { id: 'b', handle: 'b', name: 'B', workouts: 10 },
  { id: 'c', handle: 'c', name: 'C', workouts: 10 },
]);

if (ranked[0]?.id !== 'b' || ranked[1]?.id !== 'c' || ranked[2]?.rank !== 3) {
  throw new Error('rankBoard should sort by workouts then handle');
}
if (ordinal(1) !== '1st' || ordinal(2) !== '2nd' || ordinal(3) !== '3rd' || ordinal(11) !== '11th') {
  throw new Error('ordinal suffixes');
}

console.log('leaderboard.check ok');
