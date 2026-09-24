import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { PersonAvatar } from '@/components/PersonAvatar';
import { PushScreen } from '@/components/PushScreen';
import {
  clampedProgress,
  formatMetric,
  joinChallenge,
  leaveChallenge,
  standings,
  useChallenges,
  type Metric,
} from '@/lib/challenges';
import { useFriends } from '@/lib/friends';
import { useProfile } from '@/lib/profile';
import { CHERRY } from '@/lib/theme';

const SYMBOL: Record<Metric, SFSymbol> = {
  km: 'figure.run',
  sessions: 'checkmark.circle',
  streak: 'flame.fill',
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ChallengeScreen() {
  const id = param(useLocalSearchParams<{ id: string }>().id) ?? '';
  const challenge = useChallenges().find((item) => item.id === id) ?? null;
  const profile = useProfile();
  const friends = useFriends();
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const youWash = dark ? 'rgba(210,10,46,0.28)' : 'rgba(210,10,46,0.12)';

  if (!challenge) {
    return (
      <PushScreen title="Challenge">
        <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          This challenge isn’t here.
        </Text>
      </PushScreen>
    );
  }

  const you = challenge.participants.find((person) => person.you);
  const yours = you?.value ?? 0;
  const progress = clampedProgress(yours, challenge.goal);
  const rows = standings(challenge);
  const days = challenge.endsInDays === 1 ? '1 day left' : `${challenge.endsInDays} days left`;

  const toggle = () => {
    if (challenge.joined) {
      leaveChallenge(challenge.id, profile.username);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    joinChallenge(challenge.id, profile.username);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <PushScreen
      title={challenge.title}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={challenge.joined ? 'Leave challenge' : 'Join challenge'}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={toggle}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface
            fill={false}
            tintColor={challenge.joined ? undefined : CHERRY}
            className="h-12 items-center justify-center"
            style={{ borderRadius: 999 }}>
            <Text
              className={`text-[16px] ${challenge.joined ? 'text-foreground' : 'text-white'}`}
              style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              {challenge.joined ? 'Leave' : 'Join'}
            </Text>
          </GlassSurface>
        </Pressable>
      }>
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <SymbolView name={SYMBOL[challenge.metric]} size={22} tintColor={ink} />
          <GlassSurface fill={false} className="h-8 items-center justify-center rounded-full px-3">
            <Text className="text-[13px] text-foreground" style={{ fontFamily: 'DM Sans' }}>
              {days}
            </Text>
          </GlassSurface>
        </View>
        <Text
          className="text-5xl tracking-tight text-foreground"
          style={{ fontFamily: 'Instrument Serif', letterSpacing: -1, lineHeight: 56 }}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {formatMetric(challenge.metric, yours)}
          <Text className="text-2xl text-muted-foreground"> / {formatMetric(challenge.metric, challenge.goal)}</Text>
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: challenge.goal, now: yours }}
          className="h-3 overflow-hidden rounded-full bg-muted">
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: CHERRY }} />
        </View>
      </View>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        {rows.map((person, index) => {
          const isYou = Boolean(person.you);
          const name = isYou
            ? profile.name
            : (friends.find((friend) => friend.handle === person.handle)?.name ?? person.handle);
          const place = index + 1;
          return (
            <View key={person.handle}>
              {index > 0 ? <View className="ml-[72px] bg-border" style={styles.rule} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${place}, ${name}, ${formatMetric(challenge.metric, person.value)}`}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                onPress={() =>
                  router.push({
                    pathname: '/person/[handle]',
                    params: { handle: isYou ? profile.username : person.handle },
                  })
                }
                style={isYou ? { backgroundColor: youWash } : undefined}
                className='rounded-lg'>
                <View className="flex-row items-center gap-3 px-4 py-[13px]">
                  <Text
                    className="w-6 text-right text-[15px] text-muted-foreground"
                    style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
                    {place}
                  </Text>
                  <PersonAvatar name={name} you={isYou} size={36} ink={ink} photoUri={isYou ? profile.photoUri : null} />
                  <Text
                    className="min-w-0 flex-1 text-base text-foreground"
                    style={{ fontFamily: 'DM Sans', fontWeight: isYou ? '600' : '400' }}
                    numberOfLines={1}>
                    @{isYou ? profile.username : person.handle}
                  </Text>
                  <Text
                    className={`text-[15px] ${isYou ? 'text-cherry' : 'text-muted-foreground'}`}
                    style={{
                      fontFamily: 'DM Sans',
                      fontWeight: isYou ? '600' : '400',
                      fontVariant: ['tabular-nums'],
                    }}>
                    {formatMetric(challenge.metric, person.value)}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </GlassSurface>
    </PushScreen>
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
