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
  ScrollView,
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
import { StickerSheet } from '@/components/StickerSheet';
import { stickerDef, TEXT_STYLES, textStyleDef } from '@/lib/photoOverlays';
import { newId, type Overlay, type Shot, type StickerKind, type TextStyleId } from '@/lib/session';
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
  const [stickersOpen, setStickersOpen] = useState(false);
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
    setStickersOpen(false);
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

  const selected = shot.overlays.find((o) => o.id === selectedId) ?? null;
  const editingText = selected?.kind === 'text';

  const finishClose = () => {
    closing.current = false;
    onClose();
  };

  const back = () => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    setSelectedId(null);
    setStickersOpen(false);
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
    const next: Overlay = {
      id: newId(),
      kind: 'text',
      text: '',
      style: 'classic',
      nx: 0.5,
      ny: 0.5,
      scale: 1,
      rotation: 0,
    };
    setSelectedId(next.id);
    commit([...shot.overlays, next]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputs.current[next.id]?.focus());
    });
  };

  const addSticker = (kind: StickerKind) => {
    const def = stickerDef(kind);
    const next: Overlay = {
      id: newId(),
      kind: 'sticker',
      sticker: kind,
      text: def.sample,
      style: 'classic',
      nx: 0.5,
      ny: 0.42,
      scale: 1,
      rotation: 0,
    };
    setSelectedId(next.id);
    commit([...shot.overlays, next]);
  };

  const patch = (id: string, next: Partial<Overlay>, record: boolean) => {
    const overlays = shot.overlays.map((o) => (o.id === id ? { ...o, ...next } : o));
    if (record) commit(overlays);
    else onChange({ ...shot, overlays });
  };

  const setTextStyle = (style: TextStyleId) => {
    if (!selected || selected.kind !== 'text') return;
    void Haptics.selectionAsync();
    patch(selected.id, { style }, true);
  };

  const dismissEdit = () => {
    Keyboard.dismiss();
    if (selectedId) {
      const o = shot.overlays.find((x) => x.id === selectedId);
      if (o?.kind === 'text' && !o.text.trim()) {
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
          {shot.overlays.map((overlay) =>
            overlay.kind === 'sticker' ? (
              <DraggableSticker
                key={overlay.id}
                overlay={overlay}
                canvas={dest}
                selected={selectedId === overlay.id}
                onSelect={() => setSelectedId(overlay.id)}
                onMove={(nx, ny) => patch(overlay.id, { nx, ny }, true)}
                onTransform={(scale, rotation) => patch(overlay.id, { scale, rotation }, true)}
              />
            ) : (
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
                    onChange({
                      ...shot,
                      overlays: shot.overlays.filter((x) => x.id !== overlay.id),
                    });
                    setSelectedId(null);
                    return;
                  }
                  setPast((p) => [...p, base ?? shot.overlays]);
                  setFuture([]);
                }}
                onChangeText={(text) => patch(overlay.id, { text }, false)}
                onMove={(nx, ny) => patch(overlay.id, { nx, ny }, true)}
                onTransform={(scale, rotation) => patch(overlay.id, { scale, rotation }, true)}
              />
            ),
          )}
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
              <GlassContainer spacing={10} style={styles.topTools}>
                <Chip label="Add text" onPress={addText}>
                  <SymbolView name="textformat" size={16} tintColor="#fff" weight="semibold" />
                  <Text className="text-base text-white" style={styles.chipLabel}>
                    Text
                  </Text>
                </Chip>
                <Chip label="Stickers" onPress={() => setStickersOpen(true)}>
                  <SymbolView name="face.smiling" size={16} tintColor="#fff" weight="semibold" />
                  <Text className="text-base text-white" style={styles.chipLabel}>
                    Stickers
                  </Text>
                </Chip>
              </GlassContainer>
            </View>

            {editingText ? (
              <View pointerEvents="box-none" style={[styles.styleBar, { bottom: insets.bottom + 18 }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.styleRow}>
                  {TEXT_STYLES.map((style) => {
                    const on = selected.style === style.id;
                    return (
                      <Pressable
                        key={style.id}
                        accessibilityRole="button"
                        accessibilityLabel={style.label}
                        accessibilityState={{ selected: on }}
                        onPress={() => setTextStyle(style.id)}
                        style={({ pressed }) => [
                          styles.styleChip,
                          on && styles.styleChipOn,
                          { transform: [{ scale: pressed ? 0.96 : 1 }] },
                        ]}>
                        <View style={style.wrap}>
                          <Text style={[style.input, styles.stylePreview]}>Aa</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
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
            )}
          </>
        ) : null}

        <StickerSheet
          visible={stickersOpen}
          onClose={() => setStickersOpen(false)}
          onPick={addSticker}
        />
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

const SCALE_MIN = 0.35;
const SCALE_MAX = 5;

function useDragOverlay(
  overlay: Overlay,
  canvas: { w: number; h: number },
  onSelect: () => void,
  onMove: (nx: number, ny: number) => void,
  onTransform: (scale: number, rotation: number) => void,
) {
  const nx = useSharedValue(overlay.nx);
  const ny = useSharedValue(overlay.ny);
  const scale = useSharedValue(overlay.scale);
  const rotation = useSharedValue(overlay.rotation);
  const originX = useSharedValue(overlay.nx);
  const originY = useSharedValue(overlay.ny);
  const startScale = useSharedValue(overlay.scale);
  const startRotation = useSharedValue(overlay.rotation);
  const fingers = useSharedValue(0);
  const bw = useSharedValue(80);
  const bh = useSharedValue(32);

  useEffect(() => {
    nx.value = overlay.nx;
    ny.value = overlay.ny;
    scale.value = overlay.scale;
    rotation.value = overlay.rotation;
  }, [nx, ny, scale, rotation, overlay.nx, overlay.ny, overlay.scale, overlay.rotation]);

  const flushTransform = () => {
    'worklet';
    const s = clampScale(scale.value);
    scale.value = s;
    runOnJS(onTransform)(s, rotation.value);
  };

  const pan = Gesture.Pan()
    .maxPointers(1)
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

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      fingers.value += 1;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      scale.value = clampScale(startScale.value * e.scale);
    })
    .onFinalize(() => {
      if (fingers.value <= 0) return;
      fingers.value -= 1;
      if (fingers.value === 0) flushTransform();
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      startRotation.value = rotation.value;
      fingers.value += 1;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      rotation.value = startRotation.value + e.rotation;
    })
    .onFinalize(() => {
      if (fingers.value <= 0) return;
      fingers.value -= 1;
      if (fingers.value === 0) flushTransform();
    });

  const anchorStyle = useAnimatedStyle(() => ({
    left: nx.value * canvas.w,
    top: ny.value * canvas.h,
    transform: [{ rotate: `${rotation.value}rad` }, { scale: scale.value }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -bw.value / 2 }, { translateY: -bh.value / 2 }],
  }));

  return { pan, pinch, rotate, anchorStyle, bodyStyle, bw, bh };
}

function DraggableCaption({
  overlay,
  canvas,
  inputRef,
  onMove,
  onTransform,
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
  onTransform: (scale: number, rotation: number) => void;
  onSelect: () => void;
  onOpen: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
}) {
  const { pan, pinch, rotate, anchorStyle, bodyStyle, bw, bh } = useDragOverlay(
    overlay,
    canvas,
    onSelect,
    onMove,
    onTransform,
  );
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onOpen)();
  });
  const look = textStyleDef(overlay.style);
  const gesture = Gesture.Simultaneous(Gesture.Exclusive(pan, tap), pinch, rotate);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.overlayAnchor, anchorStyle]}>
        <Animated.View
          style={[styles.captionWrap, look.wrap, bodyStyle]}
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
            style={[styles.captionBase, look.input]}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function DraggableSticker({
  overlay,
  canvas,
  selected,
  onSelect,
  onMove,
  onTransform,
}: {
  overlay: Overlay;
  canvas: { w: number; h: number };
  selected: boolean;
  onSelect: () => void;
  onMove: (nx: number, ny: number) => void;
  onTransform: (scale: number, rotation: number) => void;
}) {
  const { pan, pinch, rotate, anchorStyle, bodyStyle, bw, bh } = useDragOverlay(
    overlay,
    canvas,
    onSelect,
    onMove,
    onTransform,
  );
  const def = stickerDef(overlay.sticker ?? 'location');
  const iconOnly = !overlay.text;
  const gesture = Gesture.Simultaneous(pan, pinch, rotate);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.overlayAnchor, selected && styles.stickerSelected, anchorStyle]}>
        <Animated.View
          style={[styles.stickerWrap, bodyStyle]}
          onLayout={(e) => {
            bw.value = e.nativeEvent.layout.width;
            bh.value = e.nativeEvent.layout.height;
          }}>
          <View style={[styles.stickerChip, iconOnly && styles.stickerIcon]}>
            <SymbolView
              name={def.symbol as 'mappin.and.ellipse'}
              size={iconOnly ? 26 : 14}
              tintColor={def.tint}
            />
            {overlay.text ? <Text style={styles.stickerText}>{overlay.text}</Text> : null}
          </View>
        </Animated.View>
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

function clampScale(n: number) {
  'worklet';
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, n));
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
  topTools: { flexDirection: 'row' },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  styleRow: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  styleChip: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  styleChipOn: {
    borderColor: '#fff',
    borderWidth: 2,
  },
  stylePreview: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
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
  overlayAnchor: {
    position: 'absolute',
  },
  captionWrap: {
    maxWidth: 280,
    alignItems: 'center',
  },
  captionBase: {
    minWidth: 72,
    padding: 0,
  },
  stickerWrap: {},
  stickerSelected: {
    opacity: 0.92,
  },
  stickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  stickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  stickerText: {
    color: '#fff',
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '600',
  },
});
