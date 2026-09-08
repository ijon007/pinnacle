import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';

type Props = {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
};

export function GlassSurface({ children, className, style, isInteractive = true }: Props) {
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const fill = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.58)';
  const rim = dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.72)';
  const shellStyle = [styles.shell, { backgroundColor: fill, borderColor: rim }, style];
  const inner = <View className={className}>{children}</View>;

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={isInteractive}
        colorScheme={dark ? 'dark' : 'light'}
        style={shellStyle}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={70} tint={dark ? 'dark' : 'light'} style={shellStyle}>
      {inner}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderCurve: 'continuous',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
