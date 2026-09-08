import { formatDuration, packColumns, picUri } from './session';

if (formatDuration(0) !== '0:00') throw new Error('zero');
if (formatDuration(999) !== '0:00') throw new Error('subsecond floors');
if (formatDuration(65_000) !== '1:05') throw new Error('minutes');
if (formatDuration(3_600_000) !== '1:00:00') throw new Error('hours');
if (formatDuration(-40) !== '0:00') throw new Error('negative');

if (picUri('file:///tmp/a.jpg') !== 'file:///tmp/a.jpg') throw new Error('file uri');
if (picUri(undefined, 'abc') !== 'data:image/jpeg;base64,abc') throw new Error('base64 wrap');
if (picUri('file:///x', 'abc') !== 'data:image/jpeg;base64,abc') throw new Error('prefer base64');

const packed = packColumns(
  [
    { width: 1, height: 2 },
    { width: 1, height: 1 },
    { width: 1, height: 1 },
    { width: 1, height: 1 },
  ],
  3,
);
if (packed.length !== 3 || packed[0]?.length !== 1 || packed[1]?.length !== 2 || packed[2]?.length !== 1) {
  throw new Error('packColumns shortest column');
}

console.log('session.check ok');
