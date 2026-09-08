import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
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
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/GlassSurface';
import { project, rubberband } from '@/lib/sheetPhysics';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const SCREEN = Dimensions.get('window').height;
const SNAP = { duration: 320, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;
const FLICK = { duration: 300, dampingRatio: 0.82, reduceMotion: ReduceMotion.System } as const;

export function GlassSheet({ visible, onClose, children }: Props) {
  const reduceMotion = useReducedMotion();
  const [alive, setAlive] = useState(visible);
  const closing = useRef(false);
  const translateY = useSharedValue(SCREEN);
  const scrim = useSharedValue(0);
  const sheetH = useSharedValue(380);

  if (visible && !alive) setAlive(true);

  const dismiss = () => {
    onClose();
  };

  const markClosing = () => {
    closing.current = true;
  };

  const bury = () => {
    closing.current = false;
    setAlive(false);
  };

  const openSheet = () => {
    closing.current = false;
    translateY.value = withSpring(0, SNAP);
    scrim.value = withSpring(1, SNAP);
  };

  const closeSheet = (velocity = 0) => {
    if (reduceMotion) {
      bury();
      return;
    }
    const spring = Math.abs(velocity) > 900 ? FLICK : SNAP;
    translateY.value = withSpring(sheetH.value + 24, { ...spring, velocity }, (done) => {
      if (done) runOnJS(bury)();
    });
    scrim.value = withSpring(0, SNAP);
  };

  useEffect(() => {
    if (visible) {
      setAlive(true);
      if (reduceMotion) {
        translateY.value = 0;
        scrim.value = 1;
        return;
      }
      translateY.value = SCREEN;
      scrim.value = 0;
      openSheet();
      return;
    }
    if (alive && !closing.current) closeSheet();
    // ponytail: open/close springs are the only motion this sheet owns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (reduceMotion) return;
      if (e.translationY < 0) {
        translateY.value = -rubberband(-e.translationY, 96);
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (reduceMotion) return;
      const projected = translateY.value + project(e.velocityY);
      const shouldClose = projected > sheetH.value * 0.28 || e.velocityY > 1100;
      if (shouldClose) {
        const spring = Math.abs(e.velocityY) > 900 ? FLICK : SNAP;
        translateY.value = withSpring(sheetH.value + 24, { ...spring, velocity: e.velocityY }, (done) => {
          if (done) runOnJS(bury)();
        });
        scrim.value = withSpring(0, SNAP);
        runOnJS(markClosing)();
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, { ...SNAP, velocity: e.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrim.value, [0, 1], [0, 1]),
  }));

  if (!alive) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen">
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={styles.fill}>
          <View style={styles.fill} pointerEvents="box-none">
            <Animated.View style={[styles.scrim, scrimStyle]}>
              <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Dismiss" />
            </Animated.View>
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[styles.sheetWrap, sheetStyle]}
                onLayout={(e) => {
                  sheetH.value = e.nativeEvent.layout.height;
                }}>
                <View style={styles.sheet}>
                  <GlassSurface isInteractive={false} fill={false} style={styles.sheetGlass} />
                  <SheetPad>
                    <View style={styles.handleHit}>
                      <View style={styles.handle} />
                    </View>
                    {children}
                  </SheetPad>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetPad({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingBottom: insets.bottom }}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  sheet: {
    borderCurve: 'continuous',
    borderRadius: 40,
    overflow: 'hidden',
  },
  sheetGlass: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(127,127,127,0.45)',
  },
});
