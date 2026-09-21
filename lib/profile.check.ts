import { normalizeUsername, profileIssue } from './profile';

if (normalizeUsername('@Avery Vale!') !== 'averyvale') throw new Error('strip @, space, bang, lowercase');
if (normalizeUsername('ab') !== 'ab') throw new Error('short handle kept for the field');
if (normalizeUsername('x'.repeat(30)).length !== 20) throw new Error('username cap');

if (profileIssue({ name: '  ', username: 'avery' }) !== 'Add a name.') throw new Error('blank name');
const short = profileIssue({ name: 'Avery', username: 'a' });
if (!short?.includes('2')) throw new Error('short username');
if (profileIssue({ name: 'Avery Vale', username: 'avery' }) !== null) throw new Error('valid draft');

console.log('profile.check ok');
