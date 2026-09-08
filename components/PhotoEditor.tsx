import { GlassContainer } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Keyboard,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/GlassSurface';
import { newId, type Overlay, type Shot } from '@/lib/session';
import { rubberband } from '@/lib/sheetPhysics';

export type PhotoOrigin = { x: number; y: number; w: number; h: number };

type Props = {
  shot: Shot | null;
  origin: PhotoOrigin;
  onClose: () => void;
  onChange: (shot: Shot) => void;
};

const SNAP = { duration: 400, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

export function PhotoEditor({ shot, origin, onClose, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { width: winW, height: winH } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<Overlay[][]>([]);
  const [future, setFuture] = useState<Overlay[][]>([]);
  const [showChrome, setShowChrome] = useState(false);
  const dest = fitBox(shot?.width ?? 3, shot?.height ?? 4, winW, winH);
  const inputs = useRef<Record<string, TextInput | null>>({});
  const textBase = useRef<Overlay[] | null>(null);
  const closing = useRef(false);
  const progress = useSharedValue(0);
  const sx0 = useSharedValue(1);
  const sy0 = useSharedValue(1);
  const tx0 = useSharedValue(0);
  const ty0 = useSharedValue(0);

  useLayoutEffect(() => {
    if (!shot) return;
    closing.current = false;
    setShowChrome(false);
    setSelectedId(null);
    setPast([]);
    setFuture([]);
    const from = origin.w > 2 ? origin : dest;
    const sx = from.w / dest.w;
    const sy = from.h / dest.h;
    sx0.value = sx;
    sy0.value = sy;
    tx0.value = from.x - dest.x - (dest.w * (1 - sx)) / 2;
    ty0.value = from.y - dest.y - (dest.h * (1 - sy)) / 2;
    const opened = () => setShowChrome(true);
    if (reduceMotion) {
      progress.value = 1;
      opened();
      return;
    }
    progress.value = 0;
    progress.value = withSpring(1, SNAP, (ok) => {
      if (ok) runOnJS(opened)();
    });
  }, [shot?.id]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [tx0.value, 0]) },
      { translateY: interpolate(progress.value, [0, 1], [ty0.value, 0]) },
      { scaleX: interpolate(progress.value, [0, 1], [sx0.value, 1]) },
      { scaleY: interpolate(progress.value, [0, 1], [sy0.value, 1]) },
    ],
  }));

  if (!shot) return null;

  const finishClose = () => {
    closing.current = false;
    onClose();
  };

  const back = () => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    setSelectedId(null);
    setShowChrome(false);
    if (reduceMotion) {
      progress.value = 0;
      finishClose();
      return;
    }
    progress.value = withSpring(0, SNAP, (ok) => {
      if (ok) runOnJS(finishClose)();
    });
  };

  const commit = (next: Overlay[]) => {
    setPast((p) => [...p, shot.overlays]);
    setFuture([]);
    onChange({ ...shot, overlays: next });
  };

  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    Keyboard.dismiss();
    setSelectedId(null);
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, shot.overlays]);
    onChange({ ...shot, overlays: prev });
  };

  const redo = () => {
    const nxt = future.at(-1);
    if (!nxt) return;
    Keyboard.dismiss();
    setSelectedId(null);
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, shot.overlays]);
    onChange({ ...shot, overlays: nxt });
  };

  const addText = () => {
    const next: Overlay = { id: newId(), text: '', nx: 0.5, ny: 0.5 };
    setSelectedId(next.id);
    commit([...shot.overlays, next]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputs.current[next.id]?.focus());
    });
  };

  const patch = (id: string, next: Partial<Overlay>, record: boolean) => {
    const overlays = shot.overlays.map((o) => (o.id === id ? { ...o, ...next } : o));
    if (record) commit(overlays);
    else onChange({ ...shot, overlays });
  };

  const dismissEdit = () => {
    Keyboard.dismiss();
    if (selectedId) {
      const o = shot.overlays.find((x) => x.id === selectedId);
      if (o && !o.text.trim()) {
        commit(shot.overlays.filter((x) => x.id !== selectedId));
      }
    }
    setSelectedId(null);
  };

  const share = () => {
    void Share.share(Platform.OS === 'ios' ? { url: shot.uri } : { message: shot.uri, title: 'Photo' });
  };

  return (
    <Modal visible animationType="none" statusBarTranslucent onRequestClose={back}>
      <GestureHandlerRootView style={styles.fill} className="bg-black">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissEdit} />
        <Animated.View
          style={[
            styles.photoBox,
            { left: dest.x, top: dest.y, width: dest.w, height: dest.h },
            photoStyle,
          ]}>
          <Pressable style={styles.fill} onPress={dismissEdit}>
            <Image
              source={{
                uri: shot.uri,
                width: Math.round(dest.w * PixelRatio.get()),
                height: Math.round(dest.h * PixelRatio.get()),
              }}
              style={{ width: dest.w, height: dest.h }}
              resizeMode="cover"
              fadeDuration={0}
            />
          </Pressable>
          {shot.overlays.map((overlay) => (
            <DraggableCaption
              key={overlay.id}
              overlay={overlay}
              canvas={dest}
              inputRef={(n) => {
                inputs.current[overlay.id] = n;
              }}
              onSelect={() => setSelectedId(overlay.id)}
              onOpen={() => {
                if (!textBase.current) textBase.current = shot.overlays;
                setSelectedId(overlay.id);
                inputs.current[overlay.id]?.focus();
              }}
              onFocus={() => {
                if (!textBase.current) textBase.current = shot.overlays;
                setSelectedId(overlay.id);
              }}
              onBlur={() => {
                const base = textBase.current;
                textBase.current = null;
                const before = base?.find((x) => x.id === overlay.id)?.text;
                const o = shot.overlays.find((x) => x.id === overlay.id);
                if (!o || before === o.text) return;
                if (!o.text.trim()) {
                  setPast((p) => [...p, base ?? shot.overlays]);
                  setFuture([]);
                  onChange({ ...shot, overlays: shot.overlays.filter((x) => x.id !== overlay.id) });
                  setSelectedId(null);
                  return;
                }
                setPast((p) => [...p, base ?? shot.overlays]);
                setFuture([]);
              }}
              onChangeText={(text) => patch(overlay.id, { text }, false)}
              onMove={(nx, ny) => patch(overlay.id, { nx, ny }, true)}
            />
          ))}
        </Animated.View>

        {showChrome ? (
          <>
            <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
              <GlassContainer spacing={10}>
                <Chip label="Close" onPress={back}>
                  <Text className="text-base text-white" style={styles.chipLabel}>
                    Close
                  </Text>
                </Chip>
              </GlassContainer>
              <GlassContainer spacing={10}>
                <Chip label="Add text" onPress={addText}>
                  <SymbolView name="textformat" size={16} tintColor="#fff" weight="semibold" />
                  <Text className="text-base text-white" style={styles.chipLabel}>
                    Text
                  </Text>
                </Chip>
              </GlassContainer>
            </View>
            <View pointerEvents="box-none" style={styles.bottomBar}>
              <GlassContainer spacing={12} style={styles.tools}>
                <Chip label="Undo" onPress={undo} disabled={!past.length}>
                  <SymbolView name="arrow.uturn.backward" size={18} tintColor="#fff" weight="semibold" />
                </Chip>
                <Chip label="Redo" onPress={redo} disabled={!future.length}>
                  <SymbolView name="arrow.uturn.forward" size={18} tintColor="#fff" weight="semibold" />
                </Chip>
              </GlassContainer>
              <GlassContainer spacing={10}>
                <Chip label="Share" onPress={share}>
                  <SymbolView name="square.and.arrow.up" size={18} tintColor="#fff" weight="semibold" />
                  <Text className="text-base text-white" style={styles.chipLabel}>
                    Share
                  </Text>
                </Chip>
              </GlassContainer>
            </View>
          </>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function Chip({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] })}>
      <GlassSurface
        className="h-11 flex-row items-center justify-center gap-1.5 px-4"
        colorScheme="dark"
        fill={false}
        glassEffectStyle="regular"
        tintColor="rgba(0,0,0,0.38)"
        isInteractive={!disabled}
        style={styles.chipGlass}>
        <View style={{ opacity: disabled ? 0.35 : 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {children}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

function DraggableCaption({
  overlay,
  canvas,
  inputRef,
  onMove,
  onSelect,
  onOpen,
  onFocus,
  onBlur,
  onChangeText,
}: {
  overlay: Overlay;
  canvas: { w: number; h: number };
  inputRef: (n: TextInput | null) => void;
  onMove: (nx: number, ny: number) => void;
  onSelect: () => void;
  onOpen: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
}) {
  const nx = useSharedValue(overlay.nx);
  const ny = useSharedValue(overlay.ny);
  const originX = useSharedValue(overlay.nx);
  const originY = useSharedValue(overlay.ny);
  const bw = useSharedValue(80);
  const bh = useSharedValue(32);

  useEffect(() => {
    nx.value = overlay.nx;
    ny.value = overlay.ny;
  }, [nx, ny, overlay.nx, overlay.ny]);

  const pan = Gesture.Pan()
    .minDistance(10)
    .onBegin(() => {
      originX.value = nx.value;
      originY.value = ny.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      const w = canvas.w;
      const h = canvas.h;
      nx.value = resist(originX.value + e.translationX / w, w);
      ny.value = resist(originY.value + e.translationY / h, h);
    })
    .onEnd((e) => {
      const cx = clamp01(nx.value);
      const cy = clamp01(ny.value);
      nx.value = withSpring(cx, { ...SNAP, velocity: e.velocityX / canvas.w });
      ny.value = withSpring(cy, { ...SNAP, velocity: e.velocityY / canvas.h });
      runOnJS(onMove)(cx, cy);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onOpen)();
  });

  const style = useAnimatedStyle(() => ({
    left: nx.value * canvas.w,
    top: ny.value * canvas.h,
    transform: [{ translateX: -bw.value / 2 }, { translateY: -bh.value / 2 }],
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        style={[styles.captionWrap, style]}
        onLayout={(e) => {
          bw.value = e.nativeEvent.layout.width;
          bh.value = e.nativeEvent.layout.height;
        }}>
        <TextInput
          ref={inputRef}
          value={overlay.text}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Text"
          placeholderTextColor="rgba(255,255,255,0.45)"
          pointerEvents="none"
          autoCorrect={false}
          underlineColorAndroid="transparent"
          style={styles.caption}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function fitBox(iw: number, ih: number, bw: number, bh: number) {
  const s = Math.min(bw / Math.max(iw, 1), bh / Math.max(ih, 1));
  const w = iw * s;
  const h = ih * s;
  return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
}

function resist(raw: number, dim: number) {
  'worklet';
  if (raw < 0) return -rubberband(-raw * dim, dim) / dim;
  if (raw > 1) return 1 + rubberband((raw - 1) * dim, dim) / dim;
  return raw;
}

function clamp01(n: number) {
  'worklet';
  return Math.min(0.92, Math.max(0.08, n));
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  photoBox: { position: 'absolute', overflow: 'hidden' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tools: { flexDirection: 'row' },
  chipGlass: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  chipLabel: {
    fontFamily: 'DM Sans',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  captionWrap: {
    position: 'absolute',
    maxWidth: 280,
    alignItems: 'center',
  },
  caption: {
    color: '#fff',
    fontFamily: 'Instrument Serif',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    textAlign: 'center',
    minWidth: 72,
    padding: 0,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
});
