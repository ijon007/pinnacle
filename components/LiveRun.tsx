import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { foldFix, formatKm, formatPace, movingElapsed, type GeoPoint } from '@/lib/run';
import { formatDuration } from '@/lib/session';
import { CHERRY } from '@/lib/theme';

const CAM_PITCH = 52;
const CAM_ALT = 650;

function cameraAt(lat: number, lng: number, heading: number) {
  return {
    center: { latitude: lat, longitude: lng },
    pitch: CAM_PITCH,
    heading,
    altitude: CAM_ALT,
  };
}

function course(deg: number | null | undefined, fallback: number) {
  if (deg == null || !Number.isFinite(deg) || deg < 0) return fallback;
  return deg;
}

type Props = {
  startedAt: number;
  now: number;
  meters: number;
  path: GeoPoint[];
  onFix: (next: { meters: number; path: GeoPoint[] }) => void;
  onStop: (elapsed: number) => void;
};

export function LiveRun({ startedAt, now, meters, path, onFix, onStop }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [following, setFollowing] = useState(true);
  const [heldMs, setHeldMs] = useState(0);
  const [heldFrom, setHeldFrom] = useState<number | null>(null);
  const map = useRef<MapView>(null);
  const followingRef = useRef(true);
  const pausedRef = useRef(false);
  const last = useRef<GeoPoint | null>(path.at(-1) ?? null);
  const headingRef = useRef(0);
  const metersRef = useRef(meters);
  const pathRef = useRef(path);
  const onFixRef = useRef(onFix);
  followingRef.current = following;
  pausedRef.current = heldFrom != null;
  metersRef.current = meters;
  pathRef.current = path;
  onFixRef.current = onFix;

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!permission?.granted) return;
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    const ingest = (loc: Location.LocationObject) => {
      if ((loc.coords.speed ?? 0) > 1.4) {
        headingRef.current = course(loc.coords.heading, headingRef.current);
      }
      if (followingRef.current) {
        map.current?.animateCamera(
          cameraAt(loc.coords.latitude, loc.coords.longitude, headingRef.current),
          { duration: 350 },
        );
      }
      if (pausedRef.current) {
        last.current = { lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp };
        return;
      }
      const folded = foldFix(last.current, {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        t: loc.timestamp,
        acc: loc.coords.accuracy,
      });
      if (!folded) return;
      last.current = folded.point;
      onFixRef.current({
        meters: metersRef.current + folded.add,
        path: [...pathRef.current, folded.point],
      });
    };

    void (async () => {
      void Location.enableNetworkProviderAsync().catch(() => undefined);
      const cached = await Location.getLastKnownPositionAsync({
        maxAge: 300_000,
        requiredAccuracy: 1000,
      });
      if (cancelled) return;
      if (cached) {
        headingRef.current = course(cached.coords.heading, headingRef.current);
        map.current?.animateCamera(
          cameraAt(cached.coords.latitude, cached.coords.longitude, headingRef.current),
          { duration: 0 },
        );
        ingest(cached);
      }
      const s = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 0,
          distanceInterval: 0,
          mayShowUserSettingsDialog: true,
        },
        ingest,
      );
      if (cancelled) s.remove();
      else sub = s;
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [permission?.granted]);

  const elapsed = movingElapsed(now, startedAt, heldMs, heldFrom);
  const paused = heldFrom != null;

  const stop = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStop(elapsed);
  };

  const togglePause = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (heldFrom == null) {
      setHeldFrom(Date.now());
      return;
    }
    setHeldMs((ms) => ms + Date.now() - heldFrom);
    setHeldFrom(null);
  };

  const recast = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowing(true);
    const tip = path.at(-1);
    if (!tip) return;
    map.current?.animateCamera(cameraAt(tip.lat, tip.lng, headingRef.current), { duration: 280 });
  };

  const coords = path.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const start = path[0];
  const padTop = insets.top + 8;
  const padBottom = Math.max(initialWindowMetrics?.insets.bottom ?? 12, 12);

  return (
    <Modal
      visible
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={stop}>
      <View style={styles.fill} className="bg-background">
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialCamera={
            start
              ? cameraAt(start.lat, start.lng, headingRef.current)
              : undefined
          }
          showsUserLocation={!!permission?.granted}
          showsMyLocationButton={false}
          showsCompass
          showsPointsOfInterests={false}
          legalLabelInsets={{ top: 0, right: 0, bottom: -80, left: 0 }}
          rotateEnabled
          pitchEnabled
          scrollEnabled
          zoomEnabled
          toolbarEnabled={false}
          mapPadding={{ top: padTop, bottom: padBottom + 168, left: 16, right: 16 }}
          userInterfaceStyle={dark ? 'dark' : 'light'}
          onPanDrag={() => {
            if (followingRef.current) setFollowing(false);
          }}>
          {coords.length > 1 ? (
            <Polyline coordinates={coords} strokeColor={CHERRY} strokeWidth={5} />
          ) : null}
        </MapView>

        <View pointerEvents="box-none" style={styles.chrome}>
          {!permission?.granted ? (
            <View pointerEvents="box-none" style={styles.permit}>
              <GlassSurface className="items-center px-6 py-5" fill={false} style={{ borderRadius: 24 }}>
                <Text className="text-center text-lg text-foreground" style={{ fontFamily: 'DM Sans' }}>
                  Location is needed to track a live run.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Allow location"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={() => void requestPermission()}
                  style={({ pressed }) => ({
                    marginTop: 16,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}>
                  <GlassSurface className="px-6 py-3" fill tintColor={CHERRY} style={{ borderRadius: 999 }}>
                    <Text className="text-base text-white" style={{ fontFamily: 'DM Sans' }}>
                      Allow location
                    </Text>
                  </GlassSurface>
                </Pressable>
              </GlassSurface>
            </View>
          ) : null}

          <View
            pointerEvents="box-none"
            style={[styles.dock, { paddingBottom: padBottom }]}>
            {!following && permission?.granted ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recenter map"
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                onPress={recast}
                style={({ pressed }) => [styles.recast, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <GlassSurface
                  className="h-11 w-11 items-center justify-center"
                  fill={false}
                  style={{ borderRadius: 999 }}>
                  <SymbolView name="location.fill" size={18} tintColor={ink} />
                </GlassSurface>
              </Pressable>
            ) : null}

            <GlassSurface
              className="px-5 pt-4 pb-5"
              fill={false}
              isInteractive={false}
              style={{ borderRadius: 28, borderCurve: 'continuous' }}>
              <View className="mb-5 justify-center">
                <View className="absolute left-0">
                  <SymbolView name="figure.run" size={20} tintColor={ink} />
                </View>
                <Text
                  className="text-center text-3xl tracking-tight"
                  style={{
                    fontFamily: 'Instrument Serif',
                    color: '#fff',
                    letterSpacing: -0.6,
                    fontVariant: ['tabular-nums'],
                  }}>
                  {formatDuration(elapsed)}
                </Text>
              </View>
              <View className="flex-row">
                <View className="flex-1 items-center">
                  <Text
                    className="text-4xl tracking-tight text-foreground"
                    style={{
                      fontFamily: 'Instrument Serif',
                      letterSpacing: -0.8,
                      fontVariant: ['tabular-nums'],
                    }}>
                    {formatPace(elapsed, meters)}
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                    Pace (/km)
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text
                    className="text-4xl tracking-tight text-foreground"
                    style={{
                      fontFamily: 'Instrument Serif',
                      letterSpacing: -0.8,
                      fontVariant: ['tabular-nums'],
                    }}>
                    {formatKm(meters)}
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>
                    Distance (km)
                  </Text>
                </View>
              </View>
            </GlassSurface>

            {paused ? (
              <View className="mt-3 flex-row gap-2.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resume run"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={togglePause}
                  style={({ pressed }) => [styles.action, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <GlassSurface
                    className="h-14 flex-row items-center justify-center gap-2"
                    fill
                    tintColor={CHERRY}
                    style={{ borderRadius: 999 }}>
                    <SymbolView name="play.fill" size={16} tintColor="#fff" />
                    <Text style={{ fontFamily: 'DM Sans', fontSize: 18, color: '#fff' }}>Resume</Text>
                  </GlassSurface>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Finish run"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={stop}
                  style={({ pressed }) => [styles.action, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <GlassSurface
                    className="h-14 flex-row items-center justify-center gap-2"
                    fill={false}
                    style={{ borderRadius: 999 }}>
                    <SymbolView name="stop.fill" size={14} tintColor={ink} />
                    <Text style={{ fontFamily: 'DM Sans', fontSize: 18, color: ink }}>Finish</Text>
                  </GlassSurface>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pause run"
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                onPress={togglePause}
                style={({ pressed }) => ({
                  marginTop: 12,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}>
                <GlassSurface
                  className="h-14 flex-row items-center justify-center gap-2"
                  fill
                  tintColor={CHERRY}
                  style={{ borderRadius: 999 }}>
                  <SymbolView name="pause.fill" size={16} tintColor="#fff" />
                  <Text style={{ fontFamily: 'DM Sans', fontSize: 18, color: '#fff' }}>Pause</Text>
                </GlassSurface>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chrome: {
    ...StyleSheet.absoluteFill,
  },
  permit: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  recast: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  action: {
    flex: 1,
  },
});
