import SegmentedControl from '@expo/ui/community/segmented-control';
import { GlassContainer } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { PersonAvatar } from '@/components/PersonAvatar';
import { PushScreen } from '@/components/PushScreen';
import {
  acceptFriend,
  cancelFriend,
  removeFriend,
  requestFriend,
  useFriends,
  type Friend,
} from '@/lib/friends';
import { CHERRY } from '@/lib/theme';

export default function FriendsScreen() {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const muted = dark ? '#A3A3A3' : '#8A8A8A';
  const people = useFriends();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState(0);
  const search = useRef<TextInput>(null);
  const needle = query.trim().toLowerCase();
  const incoming = people.filter((person) => person.status === 'incoming').length;
  const searching = needle.length > 0;
  const visible = people.filter((person) => {
    if (searching) {
      return person.name.toLowerCase().includes(needle) || person.handle.includes(needle);
    }
    if (segment === 0) return person.status === 'friend';
    return person.status === 'incoming' || person.status === 'outgoing';
  });

  return (
    <PushScreen title="Friends">
      <GlassSurface
        fill={false}
        isInteractive={false}
        className="h-11 flex-row items-center gap-2 px-3.5"
        style={{ borderRadius: 999 }}>
        <SymbolView name="magnifyingglass" size={16} tintColor={muted} />
        <TextInput
          ref={search}
          value={query}
          onChangeText={setQuery}
          placeholder="Name or @handle"
          placeholderTextColor={muted}
          selectionColor={CHERRY}
          cursorColor={CHERRY}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search people"
          style={{
            flex: 1,
            fontFamily: 'DM Sans',
            fontSize: 16,
            color: ink,
            padding: 0,
          }}
        />
      </GlassSurface>

      {searching ? null : (
        <SegmentedControl
          values={['Friends', incoming > 0 ? `Requests · ${incoming}` : 'Requests']}
          selectedIndex={segment}
          appearance={dark ? 'dark' : 'light'}
          onChange={(event) => {
            const next = event.nativeEvent.selectedSegmentIndex;
            if (next === segment) return;
            setSegment(next);
            void Haptics.selectionAsync();
          }}
        />
      )}

      {visible.length === 0 ? (
        <Empty
          title={searching ? 'Nobody matches' : segment === 0 ? 'No friends yet' : 'No requests'}
          action={searching ? 'Clear' : segment === 0 ? 'Find someone' : 'See friends'}
          onAction={() => {
            if (searching) {
              setQuery('');
              return;
            }
            if (segment === 0) {
              search.current?.focus();
              return;
            }
            setSegment(0);
          }}
        />
      ) : (
        <GlassSurface fill={false} isInteractive={false} style={styles.group}>
          {visible.map((person, index) => (
            <View key={person.id}>
              {index > 0 ? <View className="ml-[68px] bg-border" style={styles.rule} /> : null}
              <FriendRow person={person} ink={ink} />
            </View>
          ))}
        </GlassSurface>
      )}
    </PushScreen>
  );
}

function FriendRow({ person, ink }: { person: Friend; ink: string }) {
  return (
    <View className="flex-row items-center gap-3 py-2.5 pl-4 pr-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.name}, @${person.handle}`}
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPress={() => router.push({ pathname: '/person/[handle]', params: { handle: person.handle } })}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
        <PersonAvatar name={person.name} size={40} ink={ink} />
        <View className="min-w-0 flex-1">
          <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans' }} numberOfLines={1}>
            {person.name}
          </Text>
          <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }} numberOfLines={1}>
            @{person.handle}
          </Text>
        </View>
      </Pressable>
      <RowAction person={person} />
    </View>
  );
}

function RowAction({ person }: { person: Friend }) {
  const status = person.status;
  if (status === 'incoming') {
    return (
      <View className="flex-row items-center gap-2">
        <Pill
          label="Accept"
          tint
          accessibilityLabel={`Accept request from ${person.name}`}
          onPress={() => {
            acceptFriend(person.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decline ${person.name}`}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => cancelFriend(person.id)}
          hitSlop={6}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface
            fill={false}
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ borderRadius: 999 }}>
            <SymbolView name="xmark" size={12} tintColor={CHERRY} weight="bold" />
          </GlassSurface>
        </Pressable>
      </View>
    );
  }

  if (status === 'friend') {
    return (
      <Pill
        label="Friends"
        accessibilityLabel={`Remove ${person.name}`}
        onPress={() => {
          Alert.alert(`Remove ${person.name}?`, 'They’ll drop off your friends list.', [
            { text: 'Keep', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                removeFriend(person.id);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            },
          ]);
        }}
      />
    );
  }

  const add = status === 'none';
  return (
    <GlassContainer spacing={8}>
      <Pill
        label={add ? 'Add' : 'Requested'}
        tint={add}
        accessibilityLabel={add ? `Add ${person.name}` : `Cancel request to ${person.name}`}
        onPress={() => {
          if (add) {
            requestFriend(person.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
          }
          cancelFriend(person.id);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />
    </GlassContainer>
  );
}

function Pill({
  label,
  onPress,
  accessibilityLabel,
  tint = false,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        tintColor={tint ? CHERRY : undefined}
        className="h-8 items-center justify-center rounded-full px-3"
        style={{ borderRadius: 999 }}>
        <Text
          className="text-[13px]"
          style={{
            fontFamily: 'DM Sans',
            fontWeight: '600',
            color: tint ? '#fff' : undefined,
          }}>
          <Text className={tint ? 'text-white' : 'text-foreground'}>{label}</Text>
        </Text>
      </GlassSurface>
    </Pressable>
  );
}

function Empty({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <View className="items-center gap-3 py-16">
      <Text
        className="text-center text-3xl tracking-tight text-foreground"
        style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.4 }}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPress={onAction}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <GlassSurface fill={false} className="h-11 items-center justify-center rounded-full px-4">
          <Text className="text-[15px] text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
            {action}
          </Text>
        </GlassSurface>
      </Pressable>
    </View>
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
