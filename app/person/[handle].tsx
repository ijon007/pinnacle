import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
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

  const isFriend = friend?.status === 'friend';

  return (
    <PushScreen
      title={name}
      action={friend && isFriend ? <FriendMenu friend={friend} ink={ink} /> : undefined}>
      <View className="items-start gap-1">
        <PersonAvatar
          name={name}
          you={you}
          size={80}
          ink={ink}
          photoUri={you ? profile.photoUri : null}
        />
        <View className="mt-2 flex-row items-center gap-2">
          <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
            @{you ? profile.username : friend?.handle}
          </Text>
          {isFriend ? (
            <View className="flex-row items-center gap-1">
              <SymbolView name="checkmark.circle.fill" size={14} tintColor={CHERRY} />
              <Text className="text-[13px]" style={{ fontFamily: 'DM Sans', fontWeight: '600', color: CHERRY }}>
                Friends
              </Text>
            </View>
          ) : null}
        </View>
        {bio ? (
          <Text className="mt-0.5 text-[15px] text-foreground" style={{ fontFamily: 'DM Sans' }}>
            {bio}
          </Text>
        ) : null}
      </View>

      {friend && !you && !isFriend ? <Relationship friend={friend} /> : null}

      <View className="flex-row gap-2.5">
        <Chip label="Workouts" value={ranked ? String(ranked.workouts) : '—'} />
        <Chip label="Streak" value={you ? String(week) : String(friend?.streak ?? 0)} />
        <Chip label="Rank" value={ranked ? ordinal(ranked.rank) : '—'} />
      </View>

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
    <GlassSurface isInteractive={false} className="px-3.5 py-3" style={styles.chip}>
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

function FriendMenu({ friend, ink }: { friend: Friend; ink: string }) {
  const remove = () =>
    Alert.alert(`Remove ${friend.name}?`, 'They’ll drop off your friends list.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove Friend',
        style: 'destructive',
        onPress: () => {
          removeFriend(friend.id);
          router.back();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`More options for ${friend.name}`}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={remove}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ borderRadius: 999 }}>
        <SymbolView name="ellipsis" size={18} tintColor={ink} weight="semibold" />
      </GlassSurface>
    </Pressable>
  );
}

function Relationship({ friend }: { friend: Friend }) {
  const first = friend.name.split(' ')[0];

  switch (friend.status) {
    case 'none':
      return (
        <Action
          label="Add Friend"
          icon="person.badge.plus"
          tint
          onPress={() => {
            requestFriend(friend.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      );
    case 'outgoing':
      return (
        <GlassSurface isInteractive={false} className="gap-3 p-4">
          <View className="gap-0.5">
            <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              Friend request sent
            </Text>
            <Text className="text-[14px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              Waiting for {first} to accept.
            </Text>
          </View>
          <Action
            label="Cancel Request"
            onPress={() => {
              cancelFriend(friend.id);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </GlassSurface>
      );
    case 'incoming':
      return (
        <GlassSurface isInteractive={false} className="gap-3 p-4">
          <View className="gap-0.5">
            <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              {first} wants to be friends
            </Text>
            <Text className="text-[14px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              Accept to see each other’s workouts.
            </Text>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Action
                label="Decline"
                onPress={() => {
                  cancelFriend(friend.id);
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </View>
            <View className="flex-1">
              <Action
                label="Accept"
                tint
                onPress={() => {
                  acceptFriend(friend.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              />
            </View>
          </View>
        </GlassSurface>
      );
    case 'friend':
      return null;
    default: {
      const neverStatus: never = friend.status;
      return neverStatus;
    }
  }
}

function Action({
  label,
  icon,
  tint = false,
  onPress,
}: {
  label: string;
  icon?: SFSymbol;
  tint?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        tintColor={tint ? CHERRY : undefined}
        className="h-12 flex-row items-center justify-center gap-2"
        style={{ borderRadius: 999 }}>
        {icon ? <SymbolView name={icon} size={17} tintColor="#fff" weight="semibold" /> : null}
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
  chip: {
    flex: 1,
    minWidth: 0,
  },
  group: {
    alignSelf: 'stretch',
    borderCurve: 'continuous',
    borderRadius: 22,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
