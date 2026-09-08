import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { GlassContainer } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

import { GlassSurface } from '@/components/GlassSurface';
import { formatDuration, picUri } from '@/lib/session';
import { CHERRY } from '@/lib/theme';

type Props = {
  startedAt: number;
  now: number;
  lastUri: string | null;
  onCapture: (pic: { uri: string; width: number; height: number }) => void;
  onStop: () => void;
};

export function LiveCamera({ startedAt, now, lastUri, onCapture, onStop }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const ink = '#fff';
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const busy = useRef(false);
  const camera = useRef<CameraView>(null);
  const flash = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

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

  const stop = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStop();
  };

  return (
    <Modal visible animationType="none" statusBarTranslucent onRequestClose={stop}>
      <View style={styles.fill} className="bg-black">
        {permission?.granted ? (
          <CameraView
            ref={camera}
            facing={facing}
            mute
            style={StyleSheet.absoluteFill}
            onCameraReady={() => setReady(true)}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-lg text-white" style={{ fontFamily: 'DM Sans' }}>
              Camera access is needed to shoot during a live workout.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Allow camera"
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => void requestPermission()}
              style={({ pressed }) => ({ marginTop: 20, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface className="px-6 py-3" fill={false} glassEffectStyle="clear">
                <Text className="text-base text-white" style={{ fontFamily: 'DM Sans' }}>
                  Allow camera
                </Text>
              </GlassSurface>
            </Pressable>
          </View>
        )}

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />

        <View
          pointerEvents="box-none"
          style={[styles.chrome, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}>
          <GlassContainer spacing={10} style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop workout"
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={stop}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface
                className="h-11 flex-row items-center gap-1.5 px-4"
                colorScheme="dark"
                fill
                glassEffectStyle="clear"
                style={{ borderRadius: 999 }}
                tintColor={CHERRY}>
                <SymbolView name="stop.fill" size={12} tintColor="#fff" />
                <Text style={{ fontFamily: 'DM Sans', fontSize: 16, color: '#fff' }}>Stop</Text>
              </GlassSurface>
            </Pressable>

            <GlassSurface
              className="h-11 min-w-[92px] items-center justify-center px-4"
              colorScheme="dark"
              fill={false}
              glassEffectStyle="clear"
              isInteractive={false}
              style={{ borderRadius: 999 }}>
              <Text
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 18,
                  color: '#fff',
                  fontVariant: ['tabular-nums'],
                }}>
                {formatDuration(now - startedAt)}
              </Text>
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
                glassEffectStyle="clear"
                style={{ borderRadius: 999 }}>
                <SymbolView name="camera.rotate" size={18} tintColor={ink} />
              </GlassSurface>
            </Pressable>
          </GlassContainer>

          <View className="flex-row items-center justify-center">
            <View style={styles.thumbSlot}>
              {lastUri ? (
                <View style={[styles.thumb, { borderColor: dark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)' }]}>
                  <Animated.Image source={{ uri: lastUri }} style={styles.thumbImg} />
                </View>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              disabled={!permission?.granted}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => void shoot()}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <GlassSurface
                className="h-[76px] w-[76px] items-center justify-center"
                fill={false}
                glassEffectStyle="clear"
                style={{ borderRadius: 999 }}>
                <View style={styles.shutter} />
              </GlassSurface>
            </Pressable>

            <View style={styles.thumbSlot} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flash: { backgroundColor: '#fff' },
  chrome: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutter: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  thumbSlot: { width: 52, height: 52, marginHorizontal: 28 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  thumbImg: { width: '100%', height: '100%' },
});
