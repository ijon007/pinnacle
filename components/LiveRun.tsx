import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import {
  exploreMapProps,
  foldFix,
  formatKm,
  formatPace,
  mapCamera,
  MAP_VIEW_DEFAULT,
  movingElapsed,
  MAP_POI,
  type GeoPoint,
  type MapViewAngle,
} from '@/lib/run';
import { formatDuration, picUri } from '@/lib/session';
import { CHERRY } from '@/lib/theme';

const SNAP = { duration: 380, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
const FADE = { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System } as const;

function course(deg: number | null | undefined, fallback: number) {
  if (deg == null || !Number.isFinite(deg) || deg < 0) return fallback;
  return deg;
}

type Props = {
  startedAt: number;
  now: number;
  meters: number;
  path: GeoPoint[];
  lastUri: string | null;
  onCapture: (pic: { uri: string; width: number; height: number }) => void;
  onFix: (next: { meters: number; path: GeoPoint[] }) => void;
  onStop: (elapsed: number) => void;
};

export function LiveRun({
  startedAt,
  now,
  meters,
  path,
  lastUri,
  onCapture,
  onFix,
  onStop,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : '#1c1c1c';
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [following, setFollowing] = useState(true);
  const [heldMs, setHeldMs] = useState(0);
  const [heldFrom, setHeldFrom] = useState<number | null>(null);
  const [lens, setLens] = useState(false);
  const [camHud, setCamHud] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const map = useRef<MapView>(null);
  const camera = useRef<CameraView>(null);
  const busy = useRef(false);
  const driving = useRef(false);
  const viewRef = useRef<MapViewAngle>(MAP_VIEW_DEFAULT);
  const followingRef = useRef(true);
  const pausedRef = useRef(false);
  const last = useRef<GeoPoint | null>(path.at(-1) ?? null);
  const headingRef = useRef(0);
  const metersRef = useRef(meters);
  const pathRef = useRef(path);
  const onFixRef = useRef(onFix);
  const progress = useSharedValue(0);
  const opening = useSharedValue(1);
  const flash = useSharedValue(0);
  followingRef.current = following;
  pausedRef.current = heldFrom != null;
  metersRef.current = meters;
  pathRef.current = path;
  onFixRef.current = onFix;

  const drive = (lat: number, lng: number, heading: number, duration: number) => {
    driving.current = true;
    map.current?.animateCamera(mapCamera(lat, lng, heading, viewRef.current), { duration });
  };

  const snapViewFromMap = () => {
    void map.current?.getCamera().then((cam) => {
      viewRef.current = {
        pitch: cam.pitch ?? viewRef.current.pitch,
        heading: cam.heading ?? viewRef.current.heading,
        altitude: cam.altitude ?? viewRef.current.altitude,
      };
    });
  };

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
        drive(loc.coords.latitude, loc.coords.longitude, headingRef.current, 350);
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
        drive(cached.coords.latitude, cached.coords.longitude, headingRef.current, 0);
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
  const glassOn = (on: boolean) => ({
    style: on ? ('regular' as const) : ('none' as const),
    animate: !reduceMotion,
    animationDuration: 0.22,
  });
  const glassClear = (on: boolean) => ({
    style: on ? ('clear' as const) : ('none' as const),
    animate: !reduceMotion,
    animationDuration: 0.22,
  });

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
    viewRef.current = MAP_VIEW_DEFAULT;
    drive(tip.lat, tip.lng, headingRef.current, 280);
  };

  const buryLens = () => setLens(false);

  const openLens = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) void requestCamPerm();
    opening.value = 1;
    setLens(true);
    setCamHud(true);
    progress.value = reduceMotion ? 1 : withSpring(1, SNAP);
  };

  const closeLens = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCamHud(false);
    opening.value = 0;
    if (reduceMotion) {
      progress.value = 0;
      setLens(false);
      return;
    }
    progress.value = withTiming(0, FADE, (done) => {
      if (done) runOnJS(buryLens)();
    });
  };

  const shoot = async () => {
    if (busy.current || !ready || !camera.current) return;
    busy.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.7, base64: true });
      const uri = pic?.uri ?? picUri(undefined, pic?.base64);
      if (uri) {
        onCapture({
          uri,
          width: pic?.width || 3,
          height: pic?.height || 4,
        });
        flash.value = reduceMotion ? 0 : 0.5;
        flash.value = withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System });
      }
    } finally {
      busy.current = false;
    }
  };

  const coords = path.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const start = path[0];
  const padTop = insets.top + 8;
  const padBottom = Math.max(initialWindowMetrics?.insets.bottom ?? 12, 12);
  const mapPad = camHud ? 88 : 168;

  const lensStyle = useAnimatedStyle(() => {
    if (opening.value) {
      return {
        opacity: interpolate(progress.value, [0, 0.18, 1], [0, 1, 1]),
        transform: [{ scale: interpolate(progress.value, [0, 1], [0.88, 1]) }],
        borderRadius: interpolate(progress.value, [0, 1], [36, 0]),
      };
    }
    return {
      opacity: progress.value,
      transform: [{ scale: 1 }],
      borderRadius: 0,
    };
  });

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Modal
      visible
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={camHud ? closeLens : stop}>
      <View style={styles.fill} className="bg-background">
        <MapView
          ref={map}
          style={StyleSheet.absoluteFill}
          initialCamera={
            start ? mapCamera(start.lat, start.lng, headingRef.current, viewRef.current) : undefined
          }
          {...exploreMapProps}
          showsUserLocation={!!permission?.granted}
          showsMyLocationButton={false}
          showsCompass
          showsBuildings
          showsPointsOfInterests
          pointsOfInterestFilter={[...MAP_POI]}
          legalLabelInsets={{ top: 0, right: 0, bottom: -80, left: 0 }}
          mapPadding={{ top: padTop, bottom: padBottom + mapPad, left: 16, right: 16 }}
          userInterfaceStyle={dark ? 'dark' : 'light'}
          onRegionChangeStart={() => {
            if (driving.current) return;
            if (followingRef.current) setFollowing(false);
          }}
          onRegionChangeComplete={() => {
            driving.current = false;
            snapViewFromMap();
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
            pointerEvents={camHud ? 'none' : 'box-none'}
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
                glassEffectStyle={glassOn(!camHud)}
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

              <View className="mt-3 gap-2.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open camera"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={openLens}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <GlassSurface
                    className="h-14 flex-row items-center justify-center gap-2"
                    fill={false}
                    glassEffectStyle={glassOn(!camHud)}
                    style={{ borderRadius: 999 }}>
                    <SymbolView name="camera.fill" size={18} tintColor={ink} />
                    <Text style={{ fontFamily: 'DM Sans', fontSize: 18, color: ink }}>Photos</Text>
                  </GlassSurface>
                </Pressable>

                {paused ? (
                  <View className="flex-row gap-2.5">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Resume run"
                      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      onPress={togglePause}
                      style={({ pressed }) => [styles.action, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                      <GlassSurface
                        className="h-14 flex-row items-center justify-center gap-2"
                        fill
                        glassEffectStyle={glassOn(!camHud)}
                        style={{ borderRadius: 999 }}
                        tintColor={CHERRY}>
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
                        glassEffectStyle={glassOn(!camHud)}
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
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                    <GlassSurface
                      className="h-14 flex-row items-center justify-center gap-2"
                      fill
                      glassEffectStyle={glassOn(!camHud)}
                      style={{ borderRadius: 999 }}
                      tintColor={CHERRY}>
                      <SymbolView name="pause.fill" size={16} tintColor="#fff" />
                      <Text style={{ fontFamily: 'DM Sans', fontSize: 18, color: '#fff' }}>Pause</Text>
                    </GlassSurface>
                  </Pressable>
                )}
              </View>
            </View>
          {lens ? (
            <Animated.View
              pointerEvents="auto"
              style={[styles.lensWrap, { transformOrigin: '20% 92%' }, lensStyle]}>
              {camPerm?.granted ? (
                <CameraView
                  ref={camera}
                  facing={facing}
                  mute
                  style={StyleSheet.absoluteFill}
                  onCameraReady={() => setReady(true)}
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-black px-8">
                  <Text className="text-center text-lg text-white" style={{ fontFamily: 'DM Sans' }}>
                    Camera access is needed to shoot during a live run.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Allow camera"
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    onPress={() => void requestCamPerm()}
                    style={({ pressed }) => ({
                      marginTop: 20,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}>
                    <GlassSurface
                      className="px-6 py-3"
                      colorScheme="dark"
                      fill={false}
                      glassEffectStyle="clear">
                      <Text className="text-base text-white" style={{ fontFamily: 'DM Sans' }}>
                        Allow camera
                      </Text>
                    </GlassSurface>
                  </Pressable>
                </View>
              )}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
            </Animated.View>
          ) : null}

          {camHud ? (
            <View
              pointerEvents="box-none"
              style={[styles.lensChrome, { paddingTop: insets.top + 8, paddingBottom: padBottom + 6 }]}>
              <View style={styles.topRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to map"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={closeLens}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <GlassSurface
                    className="h-11 w-11 items-center justify-center"
                    colorScheme="dark"
                    fill={false}
                    glassEffectStyle={glassClear(true)}
                    style={{ borderRadius: 999 }}>
                    <SymbolView name="map.fill" size={16} tintColor="#fff" />
                  </GlassSurface>
                </Pressable>

                <GlassSurface
                  className="h-11 flex-1 flex-row items-center justify-center gap-2.5 px-4"
                  colorScheme="dark"
                  fill={false}
                  glassEffectStyle={glassClear(true)}
                  isInteractive={false}
                  style={{ borderRadius: 999, marginHorizontal: 10 }}>
                  <Text style={styles.chip}>{formatDuration(elapsed)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.chip}>{formatPace(elapsed, meters)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.chip}>{formatKm(meters)}</Text>
                </GlassSurface>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Flip camera"
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                  <GlassSurface
                    className="h-11 w-11 items-center justify-center"
                    colorScheme="dark"
                    fill={false}
                    glassEffectStyle={glassClear(true)}
                    style={{ borderRadius: 999 }}>
                    <SymbolView name="camera.rotate" size={18} tintColor="#fff" />
                  </GlassSurface>
                </Pressable>
              </View>

              <View className="flex-row items-center justify-center">
                <View style={styles.thumbSlot}>
                  {lastUri ? (
                    <View style={styles.thumb}>
                      <Animated.Image source={{ uri: lastUri }} style={styles.thumbImg} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.shutterSlot}>
                  {paused ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Finish run"
                      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      onPress={stop}
                      style={({ pressed }) => [
                        styles.finishAbove,
                        { transform: [{ scale: pressed ? 0.97 : 1 }] },
                      ]}>
                      <GlassSurface
                        className="h-11 flex-row items-center justify-center gap-1.5 px-4"
                        colorScheme="dark"
                        fill={false}
                        glassEffectStyle={glassClear(true)}
                        style={{ borderRadius: 999 }}>
                        <SymbolView name="stop.fill" size={12} tintColor="#fff" />
                        <Text style={{ fontFamily: 'DM Sans', fontSize: 16, color: '#fff' }}>Finish</Text>
                      </GlassSurface>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Take photo"
                    disabled={!camPerm?.granted}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    onPress={() => void shoot()}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                    <GlassSurface
                      className="h-[76px] w-[76px] items-center justify-center"
                      colorScheme="dark"
                      fill={false}
                      glassEffectStyle={glassClear(true)}
                      style={{ borderRadius: 999 }}>
                      <View style={styles.shutter} />
                    </GlassSurface>
                  </Pressable>
                </View>

                <View style={styles.thumbSlot}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={paused ? 'Resume run' : 'Pause run'}
                    onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    onPress={togglePause}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                    <GlassSurface
                      className="h-[52px] w-[52px] items-center justify-center"
                      colorScheme="dark"
                      fill
                      glassEffectStyle={glassClear(true)}
                      style={{ borderRadius: 999 }}
                      tintColor={CHERRY}>
                      <SymbolView name={paused ? 'play.fill' : 'pause.fill'} size={16} tintColor="#fff" />
                    </GlassSurface>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
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
  lensWrap: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  lensChrome: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(255,255,255,0.45)',
  },
  flash: { backgroundColor: '#fff' },
  shutter: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  shutterSlot: {
    width: 76,
    height: 76,
    alignItems: 'center',
  },
  finishAbove: {
    position: 'absolute',
    bottom: 88,
  },
  thumbSlot: { width: 52, height: 52, marginHorizontal: 28 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    borderCurve: 'continuous',
  },
  thumbImg: { width: '100%', height: '100%' },
});
