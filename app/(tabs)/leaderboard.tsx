import { GlassContainer } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';
import { board, initials, ordinal, type RankedPerson } from '@/lib/leaderboard';
import { CHERRY } from '@/lib/theme';

const PEOPLE = board();
const YOU = PEOPLE.find((p) => p.you)!;
const PODIUM = [PEOPLE[1], PEOPLE[0], PEOPLE[2]] as const;
const REST = PEOPLE.slice(3);

export default function LeaderboardScreen() {
  const { theme } = useUniwind();
  const ink = theme === 'dark' ? '#fff' : '#1c1c1c';
  const youWash = theme === 'dark' ? 'rgba(210,10,46,0.28)' : 'rgba(210,10,46,0.12)';

  return (
    <TabScreen
      title="Ranks"
      action={
        <GlassSurface
          fill={false}
          className="h-11 items-center justify-center rounded-full px-4">
          <Text
            className="text-[15px] text-foreground"
            style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
            You’re {ordinal(YOU.rank)}
          </Text>
        </GlassSurface>
      }>
      <GlassContainer spacing={10} style={{ width: '100%' }}>
        <View className="flex-row items-end gap-2.5 pt-1">
          {PODIUM.map((person, i) => {
            if (!person) return null;
            const place = (i === 1 ? 1 : i === 0 ? 2 : 3) as 1 | 2 | 3;
            return (
              <PodiumSlot key={person.id} person={person} place={place} ink={ink} />
            );
          })}
        </View>
      </GlassContainer>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        {REST.map((person, i) => (
          <View key={person.id}>
            {i > 0 ? <View className="ml-[72px] bg-border" style={styles.rule} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${person.rank}, ${person.handle}, ${person.workouts} workouts`}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={person.you ? { backgroundColor: youWash } : undefined}>
              <Row person={person} ink={ink} />
            </Pressable>
          </View>
        ))}
      </GlassSurface>
      <View className="h-24" />
    </TabScreen>
  );
}

function Row({ person, ink }: { person: RankedPerson; ink: string }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-[13px]">
      <Text
        className="w-6 text-right text-[15px] text-muted-foreground"
        style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
        {person.rank}
      </Text>
      <Avatar person={person} size={36} ink={ink} />
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
}: {
  person: RankedPerson;
  place: 1 | 2 | 3;
  ink: string;
}) {
  const first = place === 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ordinal(place)}, ${person.handle}, ${person.workouts} workouts`}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
        <Avatar person={person} size={first ? 72 : 54} ink={ink} ring={first} />
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

function Avatar({
  person,
  size,
  ink,
  ring,
}: {
  person: RankedPerson;
  size: number;
  ink: string;
  ring?: boolean;
}) {
  return (
    <View
      className="items-center justify-center rounded-full bg-muted"
      style={{
        width: size,
        height: size,
        borderWidth: ring || person.you ? 2 : 0,
        borderColor: ring || person.you ? CHERRY : 'transparent',
      }}>
      {person.you ? (
        <SymbolView name="person.fill" size={Math.round(size * 0.45)} tintColor={ink} />
      ) : (
        <Text
          className="text-foreground"
          style={{
            fontFamily: 'DM Sans',
            fontWeight: '600',
            fontSize: Math.round(size * 0.32),
            letterSpacing: 0.2,
          }}>
          {initials(person.name)}
        </Text>
      )}
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
