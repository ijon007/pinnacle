import { GlassContainer } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { NewChallengeSheet } from '@/components/NewChallengeSheet';
import { PersonAvatar } from '@/components/PersonAvatar';
import { TabScreen } from '@/components/TabScreen';
import { clampedProgress, standings, useChallenges, type Challenge } from '@/lib/challenges';
import { useFriends } from '@/lib/friends';
import { board, ordinal, type RankedPerson } from '@/lib/leaderboard';
import { useProfile } from '@/lib/profile';
import { CHERRY } from '@/lib/theme';

const CARD = 260;
const SNAP = CARD + 12;

export default function LeaderboardScreen() {
  const profile = useProfile();
  const people = board().map((person) =>
    person.you ? { ...person, name: profile.name, handle: profile.username } : person,
  );
  const you = people.find((person) => person.you);
  const podium = [people[1], people[0], people[2]] as const;
  const rest = people.slice(3);
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const youWash = theme === 'dark' ? 'rgba(210,10,46,0.28)' : 'rgba(210,10,46,0.12)';
  const challenges = useChallenges();
  const friends = useFriends();
  const [draftOpen, setDraftOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const jump = useRef(false);

  useEffect(() => {
    if (!jump.current) return;
    jump.current = false;
    scroller.current?.scrollToEnd({ animated: true });
  }, [challenges.length]);

  const openPerson = (person: RankedPerson) => {
    router.push({
      pathname: '/person/[handle]',
      params: { handle: person.you ? profile.username : person.handle },
    });
  };

  return (
    <>
    <TabScreen
      title="Ranks"
      action={
        <View className="flex-row items-center gap-2">
          <GlassSurface fill={false} className="h-11 items-center justify-center rounded-full px-4">
            <Text className="text-[15px] text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              You’re {ordinal(you?.rank ?? 1)}
            </Text>
          </GlassSurface>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New challenge"
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => setDraftOpen(true)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <GlassSurface
              fill={false}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ borderRadius: 999 }}>
              <SymbolView name="plus" size={20} tintColor={CHERRY} weight="semibold" />
            </GlassSurface>
          </Pressable>
        </View>
      }>
      <View className="gap-3">
        <Text
          className="text-[13px] text-muted-foreground"
          style={{ fontFamily: 'DM Sans', letterSpacing: 0.2 }}>
          Challenges
        </Text>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SNAP}
          snapToAlignment="start"
          disableIntervalMomentum
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              ink={ink}
              youHandle={profile.username}
              youPhoto={profile.photoUri}
              names={friends}
              onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New challenge"
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => setDraftOpen(true)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <View style={styles.draft}>
              <SymbolView name="plus" size={22} tintColor={CHERRY} weight="semibold" />
              <Text className="text-[15px] text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
                New challenge
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
      <GlassContainer spacing={10} style={{ width: '100%' }}>
        <View className="flex-row items-end gap-2.5 pt-1">
          {podium.map((person, i) => {
            if (!person) return null;
            const place = (i === 1 ? 1 : i === 0 ? 2 : 3) as 1 | 2 | 3;
            return (
              <PodiumSlot
                key={person.id}
                person={person}
                place={place}
                ink={ink}
                photoUri={person.you ? profile.photoUri : null}
                onPress={() => openPerson(person)}
              />
            );
          })}
        </View>
      </GlassContainer>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        {rest.map((person, i) => (
          <View key={person.id}>
            {i > 0 ? <View className="ml-[72px] bg-border" style={styles.rule} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${person.rank}, ${person.handle}, ${person.workouts} workouts`}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => openPerson(person)}
              style={person.you ? { backgroundColor: youWash } : undefined}>
              <Row person={person} ink={ink} photoUri={person.you ? profile.photoUri : null} />
            </Pressable>
          </View>
        ))}
      </GlassSurface>
      <View className="h-24" />
    </TabScreen>
    <NewChallengeSheet
      visible={draftOpen}
      onClose={() => setDraftOpen(false)}
      onCreated={() => {
        jump.current = true;
      }}
    />
    </>
  );
}

function Row({
  person,
  ink,
  photoUri,
}: {
  person: RankedPerson;
  ink: string;
  photoUri: string | null;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-[13px]">
      <Text
        className="w-6 text-right text-[15px] text-muted-foreground"
        style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
        {person.rank}
      </Text>
      <PersonAvatar name={person.name} you={person.you} size={36} ink={ink} photoUri={photoUri} />
      <Text
        className="min-w-0 flex-1 text-base text-foreground"
        style={{ fontFamily: 'DM Sans', fontWeight: person.you ? '600' : '400' }}
        numberOfLines={1}>
        @{person.handle}
      </Text>
      <Text
        className={`text-[15px] ${person.you ? 'text-cherry' : 'text-muted-foreground'}`}
        style={{
          fontFamily: 'DM Sans',
          fontWeight: person.you ? '600' : '400',
          fontVariant: ['tabular-nums'],
        }}>
        {person.workouts}
      </Text>
    </View>
  );
}

function PodiumSlot({
  person,
  place,
  ink,
  photoUri,
  onPress,
}: {
  person: RankedPerson;
  place: 1 | 2 | 3;
  ink: string;
  photoUri: string | null;
  onPress: () => void;
}) {
  const first = place === 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ordinal(place)}, ${person.handle}, ${person.workouts} workouts`}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}>
      <GlassSurface
        fill={false}
        isInteractive
        glassEffectStyle={first ? 'clear' : 'regular'}
        className="items-center px-2"
        style={{
          minHeight: first ? 204 : place === 2 ? 176 : 164,
          paddingTop: first ? 22 : 16,
          paddingBottom: first ? 18 : 14,
        }}>
        <Text
          className="mb-2.5 text-[13px] text-muted-foreground"
          style={{ fontFamily: 'DM Sans', letterSpacing: 0.4 }}>
          {ordinal(place)}
        </Text>
        <PersonAvatar
          name={person.name}
          you={person.you}
          size={first ? 72 : 54}
          ink={ink}
          ring={first}
          photoUri={photoUri}
        />
        <Text
          className="mt-2.5 text-center text-foreground"
          style={{
            fontFamily: 'Instrument Serif',
            letterSpacing: first ? -0.4 : 0,
            fontSize: first ? 20 : 15,
            lineHeight: first ? 22 : 18,
          }}
          numberOfLines={1}>
          @{person.handle}
        </Text>
        <Text
          className="mt-0.5 text-[13px] text-muted-foreground"
          style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
          {person.workouts}
        </Text>
      </GlassSurface>
    </Pressable>
  );
}

function ChallengeCard({
  challenge,
  ink,
  youHandle,
  youPhoto,
  names,
  onPress,
}: {
  challenge: Challenge;
  ink: string;
  youHandle: string;
  youPhoto: string | null;
  names: { handle: string; name: string }[];
  onPress: () => void;
}) {
  const you = challenge.participants.find((person) => person.you);
  const leader = standings(challenge)[0];
  const yours = clampedProgress(you?.value ?? 0, challenge.goal);
  const lead = clampedProgress(leader?.value ?? 0, challenge.goal);
  const days = challenge.endsInDays === 1 ? '1 day left' : `${challenge.endsInDays} days left`;
  const faces = standings(challenge).slice(0, 4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title}, ${days}`}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        isInteractive
        className="justify-between px-4 py-4"
        style={{ width: CARD, minHeight: 156 }}>
        <View>
          <Text className="text-[17px] text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }} numberOfLines={1}>
            {challenge.title}
          </Text>
          <Text className="mt-0.5 text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
            {days}
          </Text>
        </View>
        <View className="mt-4 h-3.5 justify-center">
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: challenge.goal, now: you?.value ?? 0 }}
            className="h-2 overflow-hidden rounded-full bg-muted">
            <View style={{ width: `${yours * 100}%`, height: '100%', backgroundColor: CHERRY }} />
          </View>
          <View
            style={{
              position: 'absolute',
              left: `${lead * 100}%`,
              width: 2,
              height: 14,
              marginLeft: -1,
              borderRadius: 1,
              backgroundColor: ink,
            }}
          />
        </View>
        <View className="mt-3 flex-row">
          {faces.map((person, index) => {
            const isYou = Boolean(person.you);
            const name = isYou
              ? youHandle
              : (names.find((friend) => friend.handle === person.handle)?.name ?? person.handle);
            return (
              <View key={person.handle} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                <PersonAvatar
                  name={name}
                  you={isYou}
                  size={28}
                  ink={ink}
                  photoUri={isYou ? youPhoto : null}
                />
              </View>
            );
          })}
        </View>
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
  draft: {
    width: CARD,
    minHeight: 156,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(127,127,127,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
