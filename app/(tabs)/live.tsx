import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { LiveCamera } from '@/components/LiveCamera';
import { LiveRun } from '@/components/LiveRun';
import { PhotoEditor, type PhotoOrigin } from '@/components/PhotoEditor';
import { TabScreen } from '@/components/TabScreen';
import { formatKm, formatPace, type GeoPoint } from '@/lib/run';
import { formatDuration, newId, packColumns, type Shot } from '@/lib/session';

type Kind = 'workout' | 'run';
type Phase = 'idle' | 'live' | 'summary';

const GRID_GAP = 2;
const GRID_PAD = 20;
const COLS = 3;

export default function LiveScreen() {
  const { width } = useWindowDimensions();
  const colW = (width - GRID_GAP * (COLS - 1)) / COLS;
  const [phase, setPhase] = useState<Phase>('idle');
  const [kind, setKind] = useState<Kind>('workout');
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [runMeters, setRunMeters] = useState(0);
  const [runPath, setRunPath] = useState<GeoPoint[]>([]);
  const [editing, setEditing] = useState<Shot | null>(null);
  const [origin, setOrigin] = useState<PhotoOrigin>({ x: 0, y: 0, w: 0, h: 0 });
  const thumbs = useRef<Record<string, View | null>>({});

  useEffect(() => {
    if (phase !== 'live') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  const start = (next: Kind) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const t = Date.now();
    setKind(next);
    setStartedAt(t);
    setNow(t);
    setEndedAt(0);
    setShots([]);
    setRunMeters(0);
    setRunPath([]);
    setPhase('live');
  };

  const stop = () => {
    setEndedAt(Date.now());
    setPhase('summary');
  };

  const done = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('idle');
    setShots([]);
    setRunMeters(0);
    setRunPath([]);
  };

  if (phase === 'summary') {
    const run = kind === 'run';
    const elapsed = endedAt - startedAt;
    return (
      <>
        <TabScreen
          title="Live"
          subtitle={
            run
              ? runMeters >= 50
                ? `${formatKm(runMeters)} km · ${formatPace(elapsed, runMeters)}/km`
                : 'No distance this time.'
              : shots.length
                ? 'Tap a photo to caption it.'
                : 'No photos this time.'
          }
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={done}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface className="h-11 items-center justify-center px-4" style={{ borderRadius: 999 }}>
                <Text className="text-base text-card-foreground" style={{ fontFamily: 'DM Sans' }}>
                  Done
                </Text>
              </GlassSurface>
            </Pressable>
          }>
          <View style={styles.stats}>
            <GlassSurface style={styles.stat} className="px-5 py-4" isInteractive={false}>
              <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                Time
              </Text>
              <Text
                className="mt-1 text-4xl tracking-tight text-foreground"
                style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.8 }}>
                {formatDuration(elapsed)}
              </Text>
            </GlassSurface>
            <GlassSurface style={styles.stat} className="px-5 py-4" isInteractive={false}>
              <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                {run ? 'Distance' : 'Shots'}
              </Text>
              <Text
                className="mt-1 text-4xl tracking-tight text-foreground"
                style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.8 }}>
                {run ? `${formatKm(runMeters)}` : shots.length}
              </Text>
            </GlassSurface>
          </View>
          {run ? (
            <GlassSurface style={styles.stat} className="px-5 py-4" isInteractive={false}>
              <Text className="text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                Pace
              </Text>
              <Text
                className="mt-1 text-4xl tracking-tight text-foreground"
                style={{ fontFamily: 'Instrument Serif', letterSpacing: -0.8 }}>
                {formatPace(elapsed, runMeters)}
                <Text className="text-base text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                  {' '}/km
                </Text>
              </Text>
            </GlassSurface>
          ) : (
            <View style={[styles.grid, { marginHorizontal: -GRID_PAD, gap: GRID_GAP }]}>
              {packColumns(shots, COLS).map((col, i) => (
                <View key={i} style={{ width: colW, gap: GRID_GAP }}>
                  {col.map((shot) => {
                    const h = colW * (shot.height / shot.width);
                    return (
                      <Pressable
                        key={shot.id}
                        collapsable={false}
                        ref={(n) => {
                          thumbs.current[shot.id] = n;
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Edit photo"
                        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                        onPress={() => {
                          thumbs.current[shot.id]?.measureInWindow((x, y, w, h) => {
                            setOrigin({ x, y, w, h });
                            setEditing(shot);
                          });
                        }}>
                        <Image source={{ uri: shot.uri }} style={{ width: colW, height: h }} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </TabScreen>
        {run ? null : (
          <PhotoEditor
            shot={editing}
            origin={origin}
            onClose={() => setEditing(null)}
            onChange={(next) => {
              setShots((all) => all.map((s) => (s.id === next.id ? next : s)));
              setEditing(next);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <TabScreen title="Live" subtitle="Gym with photos, or a run with GPS.">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start live workout"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => start('workout')}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface className="flex-row items-center justify-center gap-3 py-5">
            <SymbolView name="record.circle" size={28} tintColor="#d20a2e" />
            <Text className="text-3xl tracking-tight text-foreground" style={{ fontFamily: 'Instrument Serif' }}>
              Workout
            </Text>
          </GlassSurface>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start live run"
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => start('run')}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
          <GlassSurface className="flex-row items-center justify-center gap-3 py-5">
            <SymbolView name="figure.run" size={28} tintColor="#d20a2e" />
            <Text className="text-3xl tracking-tight text-foreground" style={{ fontFamily: 'Instrument Serif' }}>
              Run
            </Text>
          </GlassSurface>
        </Pressable>
      </TabScreen>
      {phase === 'live' && kind === 'workout' ? (
        <LiveCamera
          startedAt={startedAt}
          now={now}
          lastUri={shots.at(-1)?.uri ?? null}
          onCapture={(pic) => setShots((all) => [...all, { id: newId(), overlays: [], ...pic }])}
          onStop={stop}
        />
      ) : null}
      {phase === 'live' && kind === 'run' ? (
        <LiveRun
          startedAt={startedAt}
          now={now}
          meters={runMeters}
          path={runPath}
          onFix={({ meters, path }) => {
            setRunMeters(meters);
            setRunPath(path);
          }}
          onStop={(elapsed) => {
            setEndedAt(startedAt + elapsed);
            setPhase('summary');
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    width: '100%',
    gap: 12,
  },
  stat: {
    flex: 1,
    alignSelf: 'stretch',
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
