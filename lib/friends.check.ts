import { applyFriendAction } from './friends';

if (applyFriendAction('none', 'request') !== 'outgoing') throw new Error('request');
if (applyFriendAction('outgoing', 'request') !== 'outgoing') throw new Error('request is one-way');
if (applyFriendAction('incoming', 'accept') !== 'friend') throw new Error('accept');
if (applyFriendAction('none', 'accept') !== 'none') throw new Error('accept only incoming');
if (applyFriendAction('outgoing', 'cancel') !== 'none') throw new Error('cancel outgoing');
if (applyFriendAction('incoming', 'cancel') !== 'none') throw new Error('cancel incoming');
if (applyFriendAction('friend', 'cancel') !== 'friend') throw new Error('cancel leaves friends');
if (applyFriendAction('friend', 'remove') !== 'none') throw new Error('remove');
if (applyFriendAction('incoming', 'remove') !== 'incoming') throw new Error('remove only friends');

console.log('friends.check ok');
