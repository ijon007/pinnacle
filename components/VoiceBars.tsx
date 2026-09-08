import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CHERRY } from '@/lib/theme';

const COUNT = 42;
const SPRING = { duration: 90, dampingRatio: 0.9 } as const;

type Props = {
  samples: number[];
};

function Bar({ value }: { value: number }) {
  const level = useSharedValue(value);

  useEffect(() => {
    level.value = withSpring(value, SPRING);
  }, [level, value]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.08 + level.value * 0.92 }],
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function VoiceBars({ samples }: Props) {
  const bars = samples.length === COUNT ? samples : pad(samples, COUNT);

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Voice level">
      {bars.map((value, i) => (
        <Bar key={i} value={value} />
      ))}
    </View>
  );
}

export function emptyVoiceSamples() {
  return Array.from({ length: COUNT }, () => 0.08);
}

export function meteringToLevel(db: number | undefined, t = 0) {
  if (db == null || !Number.isFinite(db)) {
    // ponytail: OS metering is missing on web/sim; fake a breath until real dB exists
    return 0.18 + 0.4 * Math.abs(Math.sin(t / 140));
  }
  return Math.max(0.08, Math.min(1, (db + 48) / 48));
}

function pad(samples: number[], count: number) {
  if (samples.length >= count) return samples.slice(-count);
  return [...Array.from({ length: count - samples.length }, () => 0.08), ...samples];
}

const styles = StyleSheet.create({
  row: {
    height: 112,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bar: {
    flex: 1,
    height: 104,
    borderRadius: 99,
    backgroundColor: CHERRY,
  },
});
