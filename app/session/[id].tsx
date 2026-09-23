import * as Haptics from 'expo-haptics';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { PushScreen } from '@/components/PushScreen';
import { VoiceBars } from '@/components/VoiceBars';
import { mapCamera, MAP_POI, type GeoPoint } from '@/lib/run';
import {
  formatSessionKm,
  formatSplit,
  sessionPace,
  sessionSets,
  sessionVolume,
  useSessions,
  type Exercise,
  type Kind,
  type Session,
} from '@/lib/sessions';
import { CHERRY } from '@/lib/theme';

const KIND_LABEL: Record<Kind, string> = {
  lift: 'Lift',
  run: 'Run',
  swim: 'Swim',
  ride: 'Ride',
  cardio: 'Cardio',
  voice: 'Voice',
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SessionScreen() {
  const id = param(useLocalSearchParams<{ id: string }>().id);
  const session = useSessions().find((item) => item.id === id) ?? null;
  if (!session) {
    return (
      <PushScreen title="Session">
        <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
          This session isn’t here.
        </Text>
      </PushScreen>
    );
  }
  return <SessionBody session={session} />;
}

function SessionBody({ session }: { session: Session }) {
  const { theme } = useUniwind();
  const insets = useSafeAreaInsets();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const bg = dark ? '#161616' : '#fafafa';
  const moving = session.route && session.route.length > 1;

  const share = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Share.share({ message: `${session.name} · ${session.detail}` }).catch(() => undefined);
  };

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <Link.AppleZoomTarget>
          <View>
            {moving && session.route ? (
              <RouteHero route={session.route} km={session.km ?? 4} dark={dark} bg={bg} />
            ) : (
              <View className="items-center justify-end" style={{ height: 280, paddingBottom: 8 }}>
                <GlassSurface
                  isInteractive={false}
                  className="h-36 w-36 items-center justify-center rounded-full"
                  style={{ borderRadius: 999 }}>
                  <SymbolView name={session.symbol} size={64} tintColor={ink} weight="medium" />
                </GlassSurface>
              </View>
            )}
            <View
              pointerEvents="box-none"
              style={[styles.chrome, { top: insets.top + 4 }]}>
              <RoundButton label="Back" ink={ink} symbol="chevron.left" onPress={() => router.back()} />
              <RoundButton label="Share" ink={ink} symbol="square.and.arrow.up" onPress={share} />
            </View>
          </View>
        </Link.AppleZoomTarget>

        <View className="gap-5 px-5 pt-2">
          <View>
            <Text
              className="text-4xl tracking-tight text-foreground"
              style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.8 }}>
              {session.name}
            </Text>
            <Text className="mt-1 text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
              {session.detail}
            </Text>
          </View>
          <Stats session={session} />
          <KindDetail session={session} ink={ink} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function RouteHero({
  route,
  km,
  dark,
  bg,
}: {
  route: GeoPoint[];
  km: number;
  dark: boolean;
  bg: string;
}) {
  const lat = route.reduce((sum, point) => sum + point.lat, 0) / route.length;
  const lng = route.reduce((sum, point) => sum + point.lng, 0) / route.length;
  return (
    <View style={{ height: 320 }}>
      <MapView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        initialCamera={mapCamera(lat, lng, 18, {
          pitch: 48,
          heading: 18,
          altitude: 500 + km * 180,
        })}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsPointsOfInterests
        pointsOfInterestFilter={[...MAP_POI]}
        userInterfaceStyle={dark ? 'dark' : 'light'}>
        <Polyline
          coordinates={route.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
          strokeColor={CHERRY}
          strokeWidth={5}
          lineJoin="round"
          lineCap="round"
        />
      </MapView>
      <View pointerEvents="none" style={styles.fade}>
        {[0, 0.08, 0.22, 0.45, 0.75, 1].map((opacity, index) => (
          <View key={index} style={{ flex: 1, backgroundColor: bg, opacity }} />
        ))}
      </View>
    </View>
  );
}

function Stats({ session }: { session: Session }) {
  const tiles = tilesFor(session);
  return (
    <View className="flex-row gap-2.5">
      {tiles.map((tile) => (
        <GlassSurface key={tile.label} isInteractive={false} className="min-w-0 flex-1 px-4 py-3.5">
          <Text className="text-[13px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
            {tile.label}
          </Text>
          <Text
            className="mt-1 text-3xl tracking-tight text-foreground"
            style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.6 }}
            numberOfLines={1}
            adjustsFontSizeToFit>
            {tile.value}
            {tile.unit ? (
              <Text className="text-base text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                {` ${tile.unit}`}
              </Text>
            ) : null}
          </Text>
        </GlassSurface>
      ))}
    </View>
  );
}

function tilesFor(session: Session): { label: string; value: string; unit?: string }[] {
  const time = { label: 'Time', value: session.time };
  switch (session.kind) {
    case 'run':
    case 'ride':
      return [
        time,
        { label: 'Distance', value: session.km != null ? formatSessionKm(session.km) : '—', unit: 'km' },
        { label: 'Pace', value: sessionPace(session), unit: sessionPace(session) === '—' ? undefined : '/km' },
      ];
    case 'lift':
      return [
        time,
        { label: 'Sets', value: String(sessionSets(session)) },
        { label: 'Volume', value: String(Math.round(sessionVolume(session))), unit: 'kg' },
      ];
    case 'swim':
    case 'cardio':
    case 'voice':
      return [time, { label: 'Kind', value: KIND_LABEL[session.kind] }];
    default: {
      const neverKind: never = session.kind;
      return neverKind;
    }
  }
}

function KindDetail({ session, ink }: { session: Session; ink: string }) {
  switch (session.kind) {
    case 'run':
      return session.splits?.length ? <Splits splits={session.splits} /> : null;
    case 'lift':
      return session.exercises?.length ? <Exercises exercises={session.exercises} ink={ink} /> : null;
    case 'voice':
      return <VoiceReplay id={session.id} ink={ink} />;
    case 'ride':
    case 'swim':
    case 'cardio':
      return null;
    default: {
      const neverKind: never = session.kind;
      return neverKind;
    }
  }
}

function Splits({ splits }: { splits: number[] }) {
  const slow = Math.max(...splits);
  const best = Math.min(...splits);
  return (
    <GlassSurface fill={false} isInteractive={false} style={styles.group}>
      {splits.map((seconds, index) => {
        const fast = seconds === best;
        return (
          <View key={index}>
            {index > 0 ? <View className="ml-14 bg-border" style={styles.rule} /> : null}
            <View
              accessibilityLabel={`Kilometre ${index + 1}, ${formatSplit(seconds)}${fast ? ', fastest' : ''}`}
              className="flex-row items-center gap-3 px-4 py-3">
              <Text
                className="w-6 text-[15px] text-muted-foreground"
                style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
                {index + 1}
              </Text>
              <View className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <View
                  style={{
                    width: `${slow > 0 ? (seconds / slow) * 100 : 0}%`,
                    height: '100%',
                    borderRadius: 99,
                    backgroundColor: fast ? CHERRY : 'rgba(127,127,127,0.55)',
                  }}
                />
              </View>
              <Text
                className={`w-12 text-right text-[15px] ${fast ? 'text-cherry' : 'text-foreground'}`}
                style={{
                  fontFamily: 'DM Sans',
                  fontWeight: fast ? '600' : '400',
                  fontVariant: ['tabular-nums'],
                }}>
                {formatSplit(seconds)}
              </Text>
            </View>
          </View>
        );
      })}
    </GlassSurface>
  );
}

function Exercises({ exercises, ink }: { exercises: Exercise[]; ink: string }) {
  return (
    <View className="gap-3">
      {exercises.map((exercise) => (
        <GlassSurface key={exercise.name} fill={false} isInteractive={false} style={styles.group}>
          <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-3.5">
            <SymbolView name="dumbbell.fill" size={16} tintColor={ink} />
            <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans', fontWeight: '600' }}>
              {exercise.name}
            </Text>
          </View>
          {exercise.sets.map((set, index) => (
            <View key={index}>
              {index > 0 ? <View className="ml-14 bg-border" style={styles.rule} /> : null}
              <View
                accessibilityLabel={`Set ${index + 1}, ${set.reps} by ${set.kg} kilograms`}
                className="flex-row items-center justify-between px-4 py-2.5">
                <Text className="text-[15px] text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                  {index + 1}
                </Text>
                <Text
                  className="text-[15px] text-foreground"
                  style={{ fontFamily: 'DM Sans', fontVariant: ['tabular-nums'] }}>
                  {set.reps} × {set.kg} kg
                </Text>
              </View>
            </View>
          ))}
          <View className="h-1.5" />
        </GlassSurface>
      ))}
    </View>
  );
}

function wave(id: string) {
  let seed = 0;
  for (const char of id) seed = (seed * 33 + char.charCodeAt(0)) % 997;
  return Array.from({ length: 42 }, (_, index) => {
    const value = 0.3 + 0.65 * Math.abs(Math.sin(index * 0.45 + seed));
    return Math.min(1, value);
  });
}

function VoiceReplay({ id, ink }: { id: string; ink: string }) {
  const base = useMemo(() => wave(id), [id]);
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed > 1600) {
        setPlaying(false);
        setTick(0);
        return;
      }
      setTick(elapsed);
    }, 80);
    return () => clearInterval(timer);
  }, [playing]);

  const samples = base.map((value, index) =>
    playing ? Math.min(1, 0.2 + value * Math.abs(Math.sin(index * 0.65 + tick / 160))) : value * 0.4,
  );

  return (
    <GlassSurface fill={false} isInteractive={false} style={styles.group} className="gap-3 px-4 py-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Playing voice note' : 'Play voice note'}
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPress={() => {
          if (playing) return;
          setPlaying(true);
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <View className="flex-row items-center gap-3">
          <SymbolView name={playing ? 'waveform' : 'play.fill'} size={18} tintColor={ink} />
          <Text className="text-base text-foreground" style={{ fontFamily: 'DM Sans' }}>
            {playing ? 'Playing' : 'Play voice note'}
          </Text>
        </View>
      </Pressable>
      <VoiceBars samples={samples} />
    </GlassSurface>
  );
}

function RoundButton({
  label,
  ink,
  symbol,
  onPress,
}: {
  label: string;
  ink: string;
  symbol: 'chevron.left' | 'square.and.arrow.up';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <GlassSurface
        fill={false}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ borderRadius: 999 }}>
        <SymbolView name={symbol} size={18} tintColor={ink} weight="semibold" />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chrome: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
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
