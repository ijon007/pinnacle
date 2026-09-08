import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';

type Props = {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  isInteractive?: boolean;
  /** Painted wash on top of glass. Off for controls so the material can show. */
  fill?: boolean;
  tintColor?: string;
  glassEffectStyle?: GlassStyle;
  colorScheme?: 'auto' | 'light' | 'dark';
};

export function GlassSurface({
  children,
  className,
  style,
  isInteractive = true,
  fill = true,
  glassEffectStyle = 'regular',
  tintColor,
  colorScheme = 'auto',
}: Props) {
  const { theme } = useUniwind();
  const dark = colorScheme === 'auto' ? theme === 'dark' : colorScheme === 'dark';
  const wash = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.58)';
  const rim = dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.72)';
  const inner = <View className={className}>{children}</View>;
  const glass = isLiquidGlassAvailable();
  const shellStyle = [
    styles.shell,
    fill || !glass
      ? { backgroundColor: tintColor ?? wash, borderColor: rim }
      : { borderWidth: 0 },
    style,
  ];

  if (glass) {
    return (
      <GlassView
        collapsable={false}
        glassEffectStyle={glassEffectStyle}
        isInteractive={isInteractive}
        colorScheme={dark ? 'dark' : 'light'}
        tintColor={tintColor}
        style={shellStyle}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={fill ? 70 : 40} tint={dark ? 'dark' : 'light'} style={shellStyle}>
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
