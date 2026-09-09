import { foldFix, formatKm, formatPace, metersBetween, movingElapsed } from './run';

const a = { lat: 0, lng: 0, t: 0 };
const b = { lat: 0, lng: 0.001, t: 1000 };
const equator001 = metersBetween(a, b);
if (Math.abs(equator001 - 111.195) > 0.5) throw new Error(`haversine ${equator001}`);
if (metersBetween(a, a) !== 0) throw new Error('zero distance');

if (formatKm(0) !== '0.00') throw new Error('km zero');
if (formatKm(4210) !== '4.21') throw new Error('km two decimals');
if (formatKm(12_400) !== '12.4') throw new Error('km one decimal');

if (movingElapsed(10_000, 0, 0, null) !== 10_000) throw new Error('elapsed running');
if (movingElapsed(10_000, 0, 2000, 8000) !== 6000) throw new Error('elapsed paused');
if (movingElapsed(10_000, 0, 3000, null) !== 7000) throw new Error('elapsed after hold');

if (formatPace(360_000, 1000) !== '6:00') throw new Error('pace 6:00');
if (formatPace(352_000, 1000) !== '5:52') throw new Error('pace 5:52');
if (formatPace(60_000, 10) !== '—') throw new Error('pace needs distance');

const coarse = foldFix(null, { lat: 0, lng: 0, t: 1, acc: 200 });
if (!coarse || coarse.add !== 0) throw new Error('first fix accepts coarse');
const first = foldFix(null, { lat: 0, lng: 0, t: 1, acc: 20 });
if (!first || first.add !== 0) throw new Error('first fix');

const tiny = foldFix(first.point, { lat: 0, lng: 0.000001, t: 2000, acc: 10 });
if (tiny !== null) throw new Error('tiny step');

const teleport = foldFix(first.point, { lat: 1, lng: 1, t: 2000, acc: 10 });
if (teleport !== null) throw new Error('teleport');

const step = foldFix(first.point, { lat: 0, lng: 0.001, t: 20_000, acc: 10 });
if (!step || Math.abs(step.add - equator001) > 0.5) throw new Error('step add');

console.log('run.check ok');
