import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { TabScreen } from '@/components/TabScreen';
import { VoiceLogSheet } from '@/components/VoiceLogSheet';
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

const SESSIONS: {
  id: string;
  name: string;
  detail: string;
  time: string;
  symbol: SFSymbol;
}[] = [
  {
    id: '1',
    name: 'Upper',
    detail: 'Today · 6 exercises · 18 sets',
    time: '52m',
    symbol: 'figure.strengthtraining.traditional',
  },
  {
    id: '2',
    name: 'Run',
    detail: 'Mon · 4.2 km · 5:52/km',
    time: '28m',
    symbol: 'figure.run',
  },
];

export default function LogsScreen() {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const icon = dark ? '#fff' : '#1c1c1c';
  const [logOpen, setLogOpen] = useState(false);
  const [sessions, setSessions] = useState(SESSIONS);

  return (
    <>
      <TabScreen
      title="Logs"
      action={
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
      }>
      <View className="">
        <Text
          className="text-6xl tracking-tight text-foreground"
          style={{
            fontFamily: 'Instrument Serif',
            lineHeight: 72,
            paddingTop: 10,
            letterSpacing: -1.2,
          }}>
          {sessions.length}
        </Text>
        <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          sessions this week
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

      <View style={styles.group} className="bg-card">
        {sessions.map((session, i) => (
          <View key={session.id}>
            {i > 0 ? <View className="ml-14 bg-border" style={styles.rule} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${session.name}, ${session.time}, ${session.detail}`}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? 'rgba(127,127,127,0.14)' : undefined,
              })}>
              <View className="flex-row items-center gap-3.5 px-4 py-[14px]">
                <SymbolView name={session.symbol} size={22} tintColor={icon} weight="medium" />
                <View className="min-w-0 flex-1">
                  <Text className="text-base text-card-foreground" style={{ fontFamily: 'DM Sans' }}>
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
      </View>
      <View className="h-24" />
    </TabScreen>
      <VoiceLogSheet
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={({ durationMillis }) => {
          const mins = Math.max(1, Math.round(durationMillis / 60000));
          setSessions((prev) => [
            {
              id: String(Date.now()),
              name: 'Spoken log',
              detail: 'Today · voice',
              time:
                durationMillis < 60000
                  ? `${Math.max(1, Math.round(durationMillis / 1000))}s`
                  : `${mins}m`,
              symbol: 'mic.fill',
            },
            ...prev,
          ]);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    borderCurve: 'continuous',
    borderRadius: 22,
    overflow: 'hidden',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
});
