import { Host, Picker } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { SessionPeek } from '@/components/SessionPeek';
import { TabScreen } from '@/components/TabScreen';
import { VoiceLogSheet } from '@/components/VoiceLogSheet';
import {
  addSession,
  distanceOf,
  formatMinutes,
  formatSessionKm,
  mix,
  useSessions,
  type Kind,
  type Session,
  type Window,
} from '@/lib/sessions';
import { CHERRY } from '@/lib/theme';

const WEEK = [
  { d: 'S', n: 6, on: false, today: false },
  { d: 'M', n: 7, on: true, today: false },
  { d: 'T', n: 8, on: true, today: true },
  { d: 'W', n: 9, on: false, today: false },
  { d: 'T', n: 10, on: false, today: false },
  { d: 'F', n: 11, on: false, today: false },
  { d: 'S', n: 12, on: false, today: false },
] as const;

type RangeId = 'week' | 'prevMonth' | 'threeMonths' | 'year';

const RANGES: { id: RangeId; label: string; scope: string }[] = [
  { id: 'week', label: 'This week', scope: 'this week' },
  { id: 'prevMonth', label: 'Prev month', scope: 'last month' },
  { id: 'threeMonths', label: '3 months', scope: 'in 3 months' },
  { id: 'year', label: '1 year', scope: 'this year' },
];

const KIND_LABEL: Record<Kind, string> = {
  lift: 'Lift',
  run: 'Run',
  swim: 'Swim',
  ride: 'Ride',
  cardio: 'Cardio',
  voice: 'Voice',
};

const MIX = [CHERRY, 'rgba(210,10,46,0.55)', 'rgba(210,10,46,0.32)', 'rgba(127,127,127,0.5)', 'rgba(127,127,127,0.32)'];

function sumMinutes(sessions: { minutes: number }[]) {
  return sessions.reduce((sum, session) => sum + session.minutes, 0);
}

function inRange(window: Window, range: RangeId) {
  if (range === 'week') return window === 'week';
  if (range === 'prevMonth') return window === 'prevMonth';
  if (range === 'threeMonths') return window !== 'year';
  return true;
}

export default function LogsScreen() {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const icon = dark ? '#fff' : '#1c1c1c';
  const [logOpen, setLogOpen] = useState(false);
  const [range, setRange] = useState<RangeId>('week');
  const [peek, setPeek] = useState<Session | null>(null);
  const sessions = useSessions();
  const visible = sessions.filter((session) => inRange(session.window, range));
  const scope = RANGES.find((item) => item.id === range)?.scope ?? 'this week';
  const noun = visible.length === 1 ? 'session' : 'sessions';
  const minutes = sumMinutes(visible);
  const parts = mix(visible);
  const distance = distanceOf(visible);

  return (
    <>
      <TabScreen
        title="Logs"
        action={
          <View className="flex-row items-center gap-3">
            <Host
              matchContents
              seedColor={CHERRY}
              colorScheme={dark ? 'dark' : 'light'}
              ignoreSafeArea="all">
              <Picker
                selectedValue={range}
                onValueChange={(value) => {
                  if (value === range) return;
                  setRange(value);
                }}>
                {RANGES.map((item) => (
                  <Picker.Item key={item.id} label={item.label} value={item.id} />
                ))}
              </Picker>
            </Host>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New log"
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => setLogOpen(true)}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ borderRadius: 999 }}>
                <SymbolView name="plus" size={20} tintColor={CHERRY} weight="semibold" />
              </GlassSurface>
            </Pressable>
          </View>
        }>
      <View>
        <Text
          className="text-6xl tracking-tight text-foreground"
          style={{
            fontFamily: 'Instrument Serif',
            lineHeight: 72,
            paddingTop: 10,
            letterSpacing: -1.2,
          }}>
          {visible.length}
        </Text>
        <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          {noun} {scope}
        </Text>
      </View>

      <View className="flex-row">
        {WEEK.map((day, i) => (
          <View key={`${day.d}-${day.n}-${i}`} className="flex-1 items-center gap-2">
            <Text
              className={`text-[11px] ${day.today ? 'text-cherry' : 'text-muted-foreground'}`}
              style={{
                fontFamily: 'DM Sans',
                letterSpacing: 0.6,
                fontWeight: day.today ? '600' : '400',
              }}>
              {day.d}
            </Text>
            <View
              className={`h-11 w-11 items-center justify-center rounded-full ${
                day.today ? 'border-2 border-cherry' : ''
              }`}>
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  day.on ? 'bg-cherry' : 'bg-muted'
                }`}>
                {day.on ? (
                  <SymbolView name="checkmark" size={14} tintColor="#fff" weight="bold" />
                ) : (
                  <Text
                    className={`text-sm ${day.today ? 'text-cherry' : 'text-foreground'}`}
                    style={{ fontFamily: 'DM Sans' }}>
                    {day.n}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        <View className="gap-3 px-4 py-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              Time
            </Text>
            <Text
              className="text-3xl tracking-tight text-foreground"
              style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.6 }}>
              {formatMinutes(minutes)}
            </Text>
          </View>
          <View
            accessibilityRole="image"
            accessibilityLabel={
              parts.length
                ? parts.map(([kind, amount]) => `${KIND_LABEL[kind]} ${formatMinutes(amount)}`).join(', ')
                : 'No time logged'
            }
            className="h-2 flex-row overflow-hidden rounded-full bg-muted">
            {parts.map(([kind, amount], index) => (
              <View key={kind} style={{ flex: amount, backgroundColor: MIX[index] ?? MIX[MIX.length - 1] }} />
            ))}
          </View>
          {parts.length > 0 ? (
            <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
              {parts.map(([kind], index) => (
                <View key={kind} className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: MIX[index] ?? MIX[MIX.length - 1] }}
                  />
                  <Text className="text-[12px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                    {KIND_LABEL[kind]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              No time logged
            </Text>
          )}
        </View>
      </GlassSurface>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        <View className="flex-row items-center gap-3 px-4 py-4">
          <View className="min-w-0 flex-1">
            <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              Distance
            </Text>
            <Text
              className="mt-0.5 text-[13px] text-muted-foreground"
              style={{ fontFamily: 'DM Sans' }}
              numberOfLines={1}>
              {distance.note || 'No distance logged'}
            </Text>
          </View>
          <Text
            className="text-3xl tracking-tight text-foreground"
            style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.6 }}>
            {formatSessionKm(distance.km)}
            <Text className="text-base text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              {' '}
              km
            </Text>
          </Text>
        </View>
      </GlassSurface>

      <GlassSurface fill={false} isInteractive={false} style={styles.group}>
        {visible.map((session, i) => (
          <View key={session.id}>
            {i > 0 ? <View className="ml-14 bg-border" style={styles.rule} /> : null}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${session.name}, ${session.time}, ${session.detail}`}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                onPress={() => setPeek(session)}>
                <View className="flex-row items-center gap-3.5 px-4 py-[14px]">
                  <SymbolView name={session.symbol} size={22} tintColor={icon} weight="medium" />
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
          </View>
        ))}
      </GlassSurface>
      <View className="h-24" />
    </TabScreen>
      <VoiceLogSheet
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={({ durationMillis }) => {
          const mins = Math.max(1, Math.round(durationMillis / 60000));
          addSession({
            id: String(Date.now()),
            name: 'Spoken log',
            detail: 'Today · voice',
            time:
              durationMillis < 60000
                ? `${Math.max(1, Math.round(durationMillis / 1000))}s`
                : `${mins}m`,
            minutes: Math.round(durationMillis / 60000),
            symbol: 'mic.fill',
            kind: 'voice',
            window: 'week',
          });
        }}
      />
      <SessionPeek session={peek} onClose={() => setPeek(null)} />
    </>
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
