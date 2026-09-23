import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { PersonAvatar } from '@/components/PersonAvatar';
import { PushScreen } from '@/components/PushScreen';
import { ZoomLink } from '@/components/ZoomLink';
import {
  acceptFriend,
  cancelFriend,
  removeFriend,
  requestFriend,
  useFriends,
  type Friend,
} from '@/lib/friends';
import { board, ordinal } from '@/lib/leaderboard';
import { useProfile } from '@/lib/profile';
import { useSessions } from '@/lib/sessions';
import { CHERRY } from '@/lib/theme';

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function PersonScreen() {
  const handle = param(useLocalSearchParams<{ handle: string }>().handle) ?? '';
  const profile = useProfile();
  const friends = useFriends();
  const sessions = useSessions();
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const you = handle === profile.username;
  const friend = friends.find((person) => person.handle === handle) ?? null;
  const ranked = board()
    .map((person) => (person.you ? { ...person, name: profile.name, handle: profile.username } : person))
    .find((person) => person.handle === handle);

  if (!you && !friend) {
    return (
      <PushScreen title="Profile">
        <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          Nobody goes by @{handle}.
        </Text>
      </PushScreen>
    );
  }

  const name = you ? profile.name : (friend?.name ?? handle);
  const bio = you ? profile.bio : (friend?.bio ?? '');
  const recent = (you ? sessions.slice(0, 3) : sessions.filter((session) => friend?.recent.includes(session.id))).slice(
    0,
    3,
  );
  const week = sessions.filter((session) => session.window === 'week').length;

  return (
    <PushScreen title={name}>
      <View className="items-start gap-1">
        <PersonAvatar
          name={name}
          you={you}
          size={80}
          ink={ink}
          photoUri={you ? profile.photoUri : null}
        />
        <Text className="mt-2 text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          @{you ? profile.username : friend?.handle}
        </Text>
        {bio ? (
          <Text className="mt-0.5 text-[15px] text-foreground" style={{ fontFamily: 'DM Sans' }}>
            {bio}
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-2.5">
        <Chip label="Workouts" value={ranked ? String(ranked.workouts) : '—'} />
        <Chip label="Streak" value={you ? String(week) : String(friend?.streak ?? 0)} />
        <Chip label="Rank" value={ranked ? ordinal(ranked.rank) : '—'} />
      </View>

      {you || !friend ? null : <Relationship friend={friend} />}

      {recent.length > 0 ? (
        <View className="gap-3">
          <Text
            className="text-[13px] text-muted-foreground"
            style={{ fontFamily: 'DM Sans', letterSpacing: 0.2 }}>
            Recent
          </Text>
          <GlassSurface fill={false} isInteractive={false} style={styles.group}>
            {recent.map((session, index) => (
              <View key={session.id}>
                {index > 0 ? <View className="ml-4 bg-border" style={styles.rule} /> : null}
                <ZoomLink href={{ pathname: '/session/[id]', params: { id: session.id } }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${session.name}, ${session.time}`}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                    <View className="flex-row items-center justify-between px-4 py-3.5">
                      <View className="min-w-0 flex-1">
                        <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans' }}>
                          {session.name}
                        </Text>
                        <Text
                          className="mt-0.5 text-[13px] text-muted-foreground"
                          style={{ fontFamily: 'DM Sans' }}
                          numberOfLines={1}>
                          {session.detail}
                        </Text>
                      </View>
                      <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                        {session.time}
                      </Text>
                    </View>
                  </Pressable>
                </ZoomLink>
              </View>
            ))}
          </GlassSurface>
        </View>
      ) : null}
    </PushScreen>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <GlassSurface isInteractive={false} className="min-w-0 flex-1 px-3 py-3">
      <Text className="text-[12px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
        {label}
      </Text>
      <Text
        className="mt-0.5 text-2xl tracking-tight text-foreground"
        style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.4 }}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </Text>
    </GlassSurface>
  );
}

function Relationship({ friend }: { friend: Friend }) {
  const [ask, setAsk] = useState(false);
  const status = friend.status;
  const label =
    status === 'none' ? 'Add' : status === 'outgoing' ? 'Requested' : status === 'incoming' ? 'Accept' : 'Friends';
  const tint = status === 'none' || status === 'incoming';

  const press = () => {
    if (status === 'none') {
      requestFriend(friend.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (status === 'outgoing') {
      cancelFriend(friend.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (status === 'incoming') {
      acceptFriend(friend.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    setAsk(true);
    Alert.alert(`Remove ${friend.name}?`, 'They’ll drop off your friends list.', [
      { text: 'Keep', style: 'cancel', onPress: () => setAsk(false) },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setAsk(false);
          removeFriend(friend.id);
          router.back();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: ask }}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={press}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        tintColor={tint ? CHERRY : undefined}
        className="h-12 items-center justify-center"
        style={{ borderRadius: 999 }}>
        <Text
          className={`text-[16px] ${tint ? 'text-white' : 'text-foreground'}`}
          style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
          {label}
        </Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    alignSelf: 'stretch',
    borderCurve: 'continuous',
    borderRadius: 22,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
